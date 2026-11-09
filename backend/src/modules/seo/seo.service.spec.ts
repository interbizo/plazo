import { Logger } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { SubscriptionPlan } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";
import { SeoService } from "./seo.service";

describe("SeoService", () => {
  let service: SeoService;
  let findUnique: jest.Mock;

  beforeEach(async () => {
    findUnique = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeoService,
        {
          provide: PrismaService,
          useValue: {
            tenant: { findUnique },
            product: { findMany: jest.fn().mockResolvedValue([]) },
            service: { findMany: jest.fn().mockResolvedValue([]) },
          },
        },
      ],
    }).compile();

    service = module.get<SeoService>(SeoService);
  });

  it.each(["plazo.id", "www.plazo.id:443"])(
    "allows public marketplace pages for the main host %s",
    async (host) => {
      const robotsTxt = await service.generateRobotsTxt(undefined, host);

      expect(robotsTxt).toContain("# Status: PLATFORM — Public Indexing Enabled");
      expect(robotsTxt).toContain("Allow: /");
      expect(findUnique).not.toHaveBeenCalled();
    },
  );

  it.each(["example.com", "api.plazo.id", "nested.shop.plazo.id"])(
    "denies indexing for an unrecognized host %s",
    async (host) => {
      const robotsTxt = await service.generateRobotsTxt(undefined, host);

      expect(robotsTxt).toContain("Disallow: /");
      expect(robotsTxt).not.toContain("# Status: PLATFORM");
      expect(findUnique).not.toHaveBeenCalled();
    },
  );

  it("allows an active paid tenant even when isSeoActive is false", async () => {
    findUnique.mockResolvedValue({
      subdomain: "shop",
      isActive: true,
      subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
      isSeoActive: false,
    });

    const robotsTxt = await service.generateRobotsTxt("shop", "shop.plazo.id");

    expect(robotsTxt).toContain("# Status: SUBSCRIBED — SEO Indexing Enabled");
    expect(robotsTxt).toContain("Allow: /");
    expect(findUnique).toHaveBeenCalledWith({
      where: { subdomain: "shop" },
      select: {
        subdomain: true,
        isActive: true,
        subscriptionPlan: true,
      },
    });
  });

  it("denies indexing for a FREE tenant", async () => {
    findUnique.mockResolvedValue({
      subdomain: "free",
      isActive: true,
      subscriptionPlan: SubscriptionPlan.FREE,
    });

    const robotsTxt = await service.generateRobotsTxt("free", "free.plazo.id");

    expect(robotsTxt).toContain("# Status: FREE PLAN — No Indexing");
    expect(robotsTxt).toContain("Disallow: /");
  });

  it("denies indexing for an inactive paid tenant", async () => {
    findUnique.mockResolvedValue({
      subdomain: "inactive",
      isActive: false,
      subscriptionPlan: SubscriptionPlan.PREMIUM,
    });

    const robotsTxt = await service.generateRobotsTxt("inactive", "inactive.plazo.id");

    expect(robotsTxt).toContain("Disallow: /");
  });

  it("denies indexing when the requested tenant does not exist", async () => {
    findUnique.mockResolvedValue(null);

    const robotsTxt = await service.generateRobotsTxt("missing", "missing.plazo.id");

    expect(robotsTxt).toContain("Disallow: /");
  });

  it("denies indexing if tenant lookup fails", async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    findUnique.mockRejectedValue(new Error("database unavailable"));

    const robotsTxt = await service.generateRobotsTxt("shop", "shop.plazo.id");

    expect(robotsTxt).toContain("Disallow: /");
    loggerSpy.mockRestore();
  });

  it("uses active paid plan eligibility for meta tags and sitemaps", async () => {
    findUnique.mockResolvedValue({
      id: "tenant-id",
      subdomain: "shop",
      isActive: true,
      subscriptionPlan: SubscriptionPlan.BASIC,
      isSeoActive: false,
    });

    const metaTags = await service.getSeoMetaTags("shop");
    const sitemap = await service.generateSitemapIndex("shop");

    expect(metaTags.robots).toBe("index, follow");
    expect(sitemap).toContain("https://shop.plazo.id/");
    expect(findUnique).toHaveBeenCalledWith({
      where: { subdomain: "shop" },
      select: {
        id: true,
        isActive: true,
        subscriptionPlan: true,
      },
    });
  });
});
function expect(robotsTxt: string) {
  throw new Error("Function not implemented.");
}

