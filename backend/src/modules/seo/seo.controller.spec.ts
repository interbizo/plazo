import { Test, TestingModule } from "@nestjs/testing";
import { Request, Response } from "express";
import { SeoController } from "./seo.controller";
import { SeoService } from "./seo.service";

describe("SeoController", () => {
  let controller: SeoController;
  let generateRobotsTxt: jest.Mock;

  beforeEach(async () => {
    generateRobotsTxt = jest.fn().mockResolvedValue("User-agent: *\nDisallow: /\n");
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeoController],
      providers: [
        {
          provide: SeoService,
          useValue: { generateRobotsTxt },
        },
      ],
    }).compile();

    controller = module.get<SeoController>(SeoController);
  });

  async function getRobotsTxt(host: string, forwardedHost?: string) {
    const request = {
      get: (header: string) => {
        if (header.toLowerCase() === "x-forwarded-host") {
          return forwardedHost;
        }
        return header.toLowerCase() === "host" ? host : undefined;
      },
    } as unknown as Request;
    const response = {
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    } as unknown as Response;

    await controller.getRobotsTxt(request, response);
    return response.send;
  }

  it.each(["plazo.id", "www.plazo.id:443"])(
    "passes root domains to the main-domain rules: %s",
    async (host) => {
      await getRobotsTxt(host);

      expect(generateRobotsTxt).toHaveBeenCalledWith(undefined, host.toLowerCase());
    },
  );

  it("extracts a tenant only from a direct plazo.id subdomain", async () => {
    await getRobotsTxt("shop.plazo.id");

    expect(generateRobotsTxt).toHaveBeenCalledWith("shop", "shop.plazo.id");
  });

  it("uses the forwarded host when the request passes through a proxy", async () => {
    await getRobotsTxt("plazo.id", "shop.plazo.id");

    expect(generateRobotsTxt).toHaveBeenCalledWith("shop", "shop.plazo.id");
  });

  it.each(["api.plazo.id", "shop.example.com", "nested.shop.plazo.id"])(
    "does not classify reserved or unrelated hosts as tenants: %s",
    async (host) => {
      await getRobotsTxt(host);

      expect(generateRobotsTxt).toHaveBeenCalledWith(undefined, host);
    },
  );

  it("uses the main-domain fallback only for root hosts", async () => {
    generateRobotsTxt.mockRejectedValue(new Error("generation failed"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    const rootResponse = await getRobotsTxt("plazo.id");
    const unknownResponse = await getRobotsTxt("example.com");

    expect(rootResponse).toHaveBeenCalledWith(expect.stringContaining("Allow: /"));
    expect(unknownResponse).toHaveBeenCalledWith("User-agent: *\nDisallow: /\n");
    consoleSpy.mockRestore();
  });
});
