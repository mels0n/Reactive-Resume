import { HttpService } from "@nestjs/axios";
import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ResumeDto } from "@reactive-resume/dto";
import { ErrorMessage } from "@reactive-resume/utils";
import retry from "async-retry";
import { PDFDocument } from "pdf-lib";
import { connect } from "puppeteer-core";

import { Config } from "../config/schema";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  private readonly browserURL: string;

  private readonly ignoreHTTPSErrors: boolean;

  constructor(
    private readonly configService: ConfigService<Config>,
    private readonly storageService: StorageService,
    private readonly httpService: HttpService,
  ) {
    const chromeUrl = this.configService.getOrThrow<string>("CHROME_URL");
    const chromeToken = this.configService.getOrThrow<string>("CHROME_TOKEN");

    this.browserURL = `${chromeUrl}?token=${chromeToken}`;
    this.ignoreHTTPSErrors = this.configService.getOrThrow<boolean>("CHROME_IGNORE_HTTPS_ERRORS");
  }

  private async getBrowser() {
    try {
      return await connect({
        browserWSEndpoint: this.browserURL,
        acceptInsecureCerts: this.ignoreHTTPSErrors,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        ErrorMessage.InvalidBrowserConnection,
        (error as Error).message,
      );
    }
  }

  async getVersion() {
    const browser = await this.getBrowser();
    const version = await browser.version();
    await browser.disconnect();
    return version;
  }

  async printResume(resume: ResumeDto, format?: "A4" | "Letter") {
    const start = performance.now();

    const url = await retry<string | undefined>(() => this.generateResume(resume, format), {
      retries: 3,
      randomize: true,
      onRetry: (_, attempt) => {
        this.logger.log(`Retrying to print resume #${resume.id}, attempt #${attempt}`);
      },
    });

    const duration = +(performance.now() - start).toFixed(0);
    const numberPages = resume.data.metadata.layout.length;

    this.logger.debug(`Chrome took ${duration}ms to print ${numberPages} page(s)`);

    return url;
  }

  async printPreview(resume: ResumeDto) {
    const start = performance.now();

    const url = await retry(() => this.generatePreview(resume), {
      retries: 3,
      randomize: true,
      onRetry: (_, attempt) => {
        this.logger.log(
          `Retrying to generate preview of resume #${resume.id}, attempt #${attempt}`,
        );
      },
    });

    const duration = +(performance.now() - start).toFixed(0);

    this.logger.debug(`Chrome took ${duration}ms to generate preview`);

    return url;
  }

  async generateResume(resume: ResumeDto, format?: "A4" | "Letter") {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      const publicUrl = this.configService.getOrThrow<string>("PUBLIC_URL");
      const storageUrl = this.configService.getOrThrow<string>("STORAGE_URL");

      let url = publicUrl;

      if ([publicUrl, storageUrl].some((url) => /https?:\/\/localhost(:\d+)?/.test(url))) {
        // Switch client URL from `http[s]://localhost[:port]` to `http[s]://host.docker.internal[:port]` in development
        // This is required because the browser is running in a container and the client is running on the host machine.
        url = url.replace(
          /localhost(:\d+)?/,
          (_match, port) => `host.docker.internal${port ?? ""}`,
        );

        await page.setRequestInterception(true);

        // Intercept requests of `localhost` to `host.docker.internal` in development
        page.on("request", (request) => {
          if (request.url().startsWith(storageUrl)) {
            const modifiedUrl = request
              .url()
              .replace(/localhost(:\d+)?/, (_match, port) => `host.docker.internal${port ?? ""}`);

            void request.continue({ url: modifiedUrl });
          } else {
            void request.continue();
          }
        });
      }

      // If format is not provided (Web), merge all pages into one to ensure continuous scrolling
      if (!format) {
        const originalLayout = resume.data.metadata.layout;
        const mergedPage = originalLayout.reduce(
          (acc, page) => {
            return [
              [...acc[0], ...page[0]],
              [...acc[1], ...page[1]],
            ];
          },
          [[], []] as string[][],
        );

        resume.data.metadata.layout = [mergedPage];
      }

      // Set the data of the resume to be printed in the browser's session storage
      const numberPages = resume.data.metadata.layout.length;

      await page.goto(`${url}/artboard/preview`, { waitUntil: "domcontentloaded" });

      await page.evaluate((data) => {
        window.localStorage.setItem("resume", JSON.stringify(data));
      }, resume.data);

      await Promise.all([
        page.reload({ waitUntil: "load" }),
        // Wait until first page is present before proceeding
        page.waitForSelector('[data-page="1"]', { timeout: 15_000 }),
      ]);

      const pagesBuffer: Buffer[] = [];

      if (format) {
        // -----------------------------------------------------------------------------------------
        // Printable PDF (A4 / Letter) - Standard Page Sizes
        // -----------------------------------------------------------------------------------------

        // Apply custom CSS, if enabled
        const css = resume.data.metadata.css;

        if (css.visible) {
          await page.evaluate((cssValue: string) => {
            const styleTag = document.createElement("style");
            styleTag.textContent = cssValue;
            document.head.append(styleTag);
          }, css.value);
        }

        // Inject CSS to scale and center content, creating safe margins without layout shifts
        await page.addStyleTag({
          content: `
            [data-page] > div {
              transform: scale(0.95);
              transform-origin: center center;
              width: 100%;
            }

            html,
            body,
            #root {
              overflow: visible !important;
              height: auto !important;
            }

            [data-page] {
              break-after: page;
              page-break-after: always;
            }

            [data-page]:last-child {
              break-after: auto;
              page-break-after: auto;
            }
          `,


        });

        const uint8array = await page.pdf({
          format,
          printBackground: true,
        });
        const buffer = Buffer.from(uint8array);
        pagesBuffer.push(buffer);
      } else {
        // -----------------------------------------------------------------------------------------
        // Web PDF (Continuous) - Custom Page Size + Buffer Fix
        // -----------------------------------------------------------------------------------------

        const processPage = async (index: number) => {
          const pageElement = await page.$(`[data-page="${index}"]`);
          const width = (await (await pageElement?.getProperty("scrollWidth"))?.jsonValue()) ?? 0;

          const temporaryHtml = await page.evaluate((element: HTMLDivElement) => {
            const clonedElement = element.cloneNode(true) as HTMLDivElement;
            const temporaryHtml_ = document.body.innerHTML;
            document.body.innerHTML = clonedElement.outerHTML;
            return temporaryHtml_;
          }, pageElement);

          // Apply custom CSS, if enabled
          const css = resume.data.metadata.css;

          if (css.visible) {
            await page.evaluate((cssValue: string) => {
              const styleTag = document.createElement("style");
              styleTag.textContent = cssValue;
              document.head.append(styleTag);
            }, css.value);
          }

          // Calculate height of the isolated content + buffer
          // eslint-disable-next-line unicorn/no-await-expression-member
          const bodyHeight = await page.evaluate(async () => {
            // Wait for any layout shifts
            await new Promise((resolve) => setTimeout(resolve, 100));
            // Get precise height of the content container
            // Get precise height of the content container
            const element = document.body.firstElementChild;
            if (!element) return document.body.scrollHeight;
            return Math.max(element.getBoundingClientRect().height, document.body.scrollHeight);
          });

          const heightBuffer = 20;

          const uint8array = await page.pdf({
            width,
            height: bodyHeight + heightBuffer,
            printBackground: true,
          });
          const buffer = Buffer.from(uint8array);
          pagesBuffer.push(buffer);

          await page.evaluate((temporaryHtml_: string) => {
            document.body.innerHTML = temporaryHtml_;
          }, temporaryHtml);
        };

        // Loop through all the pages and print them, by first displaying them, printing the PDF and then hiding them back
        for (let index = 1; index <= numberPages; index++) {
          await processPage(index);
        }
      }

      // Using 'pdf-lib', merge all the pages from their buffers into a single PDF
      const pdf = await PDFDocument.create();

      for (const element of pagesBuffer) {
        const page = await PDFDocument.load(element);
        const copiedPages = await pdf.copyPages(page, page.getPageIndices());
        copiedPages.forEach((page) => pdf.addPage(page));
      }

      // Save the PDF to storage and return the URL to download the resume
      // Store the URL in cache for future requests, under the previously generated hash digest
      const buffer = Buffer.from(await pdf.save());

      // This step will also save the resume URL in cache
      const resumeUrl = await this.storageService.uploadObject(
        resume.userId,
        "resumes",
        buffer,
        resume.title,
      );

      // Close all the pages and disconnect from the browser
      await page.close();
      await browser.disconnect();

      return resumeUrl;
    } catch (error) {
      this.logger.error(error);

      throw new InternalServerErrorException(
        ErrorMessage.ResumePrinterError,
        (error as Error).message,
      );
    }
  }

  async generatePreview(resume: ResumeDto) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    const publicUrl = this.configService.getOrThrow<string>("PUBLIC_URL");
    const storageUrl = this.configService.getOrThrow<string>("STORAGE_URL");

    let url = publicUrl;

    if ([publicUrl, storageUrl].some((url) => /https?:\/\/localhost(:\d+)?/.test(url))) {
      // Switch client URL from `http[s]://localhost[:port]` to `http[s]://host.docker.internal[:port]` in development
      // This is required because the browser is running in a container and the client is running on the host machine.
      url = url.replace(/localhost(:\d+)?/, (_match, port) => `host.docker.internal${port ?? ""}`);

      await page.setRequestInterception(true);

      // Intercept requests of `localhost` to `host.docker.internal` in development
      page.on("request", (request) => {
        if (request.url().startsWith(storageUrl)) {
          const modifiedUrl = request
            .url()
            .replace(/localhost(:\d+)?/, (_match, port) => `host.docker.internal${port ?? ""}`);

          void request.continue({ url: modifiedUrl });
        } else {
          void request.continue();
        }
      });
    }

    // Set the data of the resume to be printed in the browser's session storage
    await page.evaluateOnNewDocument((data) => {
      window.localStorage.setItem("resume", JSON.stringify(data));
    }, resume.data);

    await page.setViewport({ width: 794, height: 1123 });

    await page.goto(`${url}/artboard/preview`, { waitUntil: "networkidle0" });

    // Save the JPEG to storage and return the URL
    // Store the URL in cache for future requests, under the previously generated hash digest
    const uint8array = await page.screenshot({ quality: 80, type: "jpeg" });
    const buffer = Buffer.from(uint8array);

    // Generate a hash digest of the resume data, this hash will be used to check if the resume has been updated
    const previewUrl = await this.storageService.uploadObject(
      resume.userId,
      "previews",
      buffer,
      resume.id,
    );

    // Close all the pages and disconnect from the browser
    await page.close();
    await browser.disconnect();

    return previewUrl;
  }
}
