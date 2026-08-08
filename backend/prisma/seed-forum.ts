import { AccountStatus, PrismaClient, UserRole } from "@prisma/client";

let prisma = new PrismaClient();
let db = prisma as any;

const SETTINGS_ID = "default";

const demoSlugs = [
  "forum-cara-memilih-vendor",
  "forum-optimasi-listing-seller",
  "forum-diskusi-anti-spam",
  "forum-spam-promosi-dihapus",
  "forum-pelanggaran-berulang",
];

const seedUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

type DemoUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

type SeedUserKey = "moderator" | "buyer" | "seller" | "watched" | "banned";

type SeedUserConfig = {
  env: string;
  label: string;
  roles: UserRole[];
  fallbackEmails: string[];
};

const seedUserConfigs: Record<SeedUserKey, SeedUserConfig> = {
  moderator: {
    env: "FORUM_MODERATOR_EMAIL",
    label: "moderator forum",
    roles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
    fallbackEmails: [
      "admin@plazo.id",
      "superadmin@plazo.id",
      "admin@plazo.com",
      "superadmin@plazo.com",
    ],
  },
  buyer: {
    env: "FORUM_BUYER_EMAIL",
    label: "buyer utama",
    roles: [UserRole.BUYER],
    fallbackEmails: ["buyer1@plazo.id", "buyer1@plazo.com"],
  },
  seller: {
    env: "FORUM_SELLER_EMAIL",
    label: "seller",
    roles: [UserRole.SELLER],
    fallbackEmails: ["naya@plazo.id", "seller1@plazo.com"],
  },
  watched: {
    env: "FORUM_WATCHLIST_EMAIL",
    label: "user dua strike",
    roles: [UserRole.BUYER, UserRole.SELLER],
    fallbackEmails: ["buyer2@plazo.id", "buyer2@plazo.com"],
  },
  banned: {
    env: "FORUM_BANNED_EMAIL",
    label: "user tiga strike",
    roles: [UserRole.BUYER, UserRole.SELLER],
    fallbackEmails: ["bima@plazo.id", "buyer3@plazo.com"],
  },
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function ensureForumClient() {
  if (!db.forumPost || !db.forumComment || !db.forumLike || !db.forumStrike) {
    throw new Error(
      "Forum Prisma client belum tersedia. Jalankan migration dan prisma generate terlebih dahulu.",
    );
  }
}

async function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: seedUserSelect,
  });
}

function assertSeedRole(user: DemoUser, config: SeedUserConfig) {
  if (!config.roles.includes(user.role)) {
    throw new Error(
      `${config.label} harus memakai role ${config.roles.join("/")} tetapi ${user.email} memiliki role ${user.role}.`,
    );
  }
}

async function resolveSeedUser(
  key: SeedUserKey,
  selectedUserIds: Set<string>,
) {
  const config = seedUserConfigs[key];
  const envEmail = process.env[config.env]?.trim();

  if (envEmail) {
    const user = await findUserByEmail(envEmail);
    if (!user) {
      throw new Error(`${config.label} dengan email ${envEmail} tidak ditemukan.`);
    }
    assertSeedRole(user, config);
    if (selectedUserIds.has(user.id)) {
      throw new Error(`${user.email} dipakai lebih dari satu peran seed forum.`);
    }
    selectedUserIds.add(user.id);
    return user;
  }

  for (const fallbackEmail of config.fallbackEmails) {
    const user = await findUserByEmail(fallbackEmail);
    if (user && !selectedUserIds.has(user.id)) {
      assertSeedRole(user, config);
      selectedUserIds.add(user.id);
      return user;
    }
  }

  const user = await prisma.user.findFirst({
    where: {
      role: { in: config.roles },
      isActive: true,
      accountStatus: AccountStatus.ACTIVE,
      deletedAt: null,
      id: { notIn: [...selectedUserIds] },
    },
    orderBy: { createdAt: "asc" },
    select: seedUserSelect,
  });

  if (!user) {
    throw new Error(
      `Tidak ada user existing untuk ${config.label}. Isi ${config.env}=email_user atau jalankan seed utama dulu.`,
    );
  }

  selectedUserIds.add(user.id);
  return user;
}

async function getExistingSeedUsers() {
  const selectedUserIds = new Set<string>();
  return {
    moderator: await resolveSeedUser("moderator", selectedUserIds),
    buyer: await resolveSeedUser("buyer", selectedUserIds),
    seller: await resolveSeedUser("seller", selectedUserIds),
    watched: await resolveSeedUser("watched", selectedUserIds),
    banned: await resolveSeedUser("banned", selectedUserIds),
  };
}

async function clearForumDemoData() {
  const posts = await db.forumPost.findMany({
    where: { slug: { in: demoSlugs } },
    select: { id: true },
  });
  const postIds = posts.map((post: { id: string }) => post.id);
  if (!postIds.length) return;

  const comments = await db.forumComment.findMany({
    where: { postId: { in: postIds } },
    select: { id: true },
  });
  const commentIds = comments.map((comment: { id: string }) => comment.id);
  const strikeFilters = [{ postId: { in: postIds } }];
  if (commentIds.length) {
    strikeFilters.push({ commentId: { in: commentIds } } as any);
  }

  await db.forumStrike.deleteMany({ where: { OR: strikeFilters } });
  await db.forumLike.deleteMany({ where: { postId: { in: postIds } } });
  await db.forumComment.deleteMany({ where: { postId: { in: postIds } } });
  await db.forumPost.deleteMany({ where: { id: { in: postIds } } });
}

export async function seedForum(prismaClient?: PrismaClient) {
  if (prismaClient) {
    prisma = prismaClient;
    db = prismaClient as any;
  }
  await ensureForumClient();

  const { moderator, buyer, seller, watched, banned } =
    await getExistingSeedUsers();
  const demoUsers = [moderator, buyer, seller, watched, banned];

  await clearForumDemoData();
  await prisma.user.updateMany({
    where: { id: { in: demoUsers.map((user) => user.id) } },
    data: {
      isForumBanned: false,
      forumBannedAt: null,
      forumBannedReason: null,
    },
  });

  await db.forumModerationSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {
      isAntiSpamEnabled: true,
      rateLimitWindowMinutes: 10,
      postLimitPerWindow: 3,
      commentLimitPerWindow: 12,
      duplicateWindowMinutes: 10,
      updatedBy: moderator.id,
    },
    create: {
      id: SETTINGS_ID,
      isAntiSpamEnabled: true,
      rateLimitWindowMinutes: 10,
      postLimitPerWindow: 3,
      commentLimitPerWindow: 12,
      duplicateWindowMinutes: 10,
      updatedBy: moderator.id,
    },
  });

  const vendorPost = await db.forumPost.create({
    data: {
      slug: "forum-cara-memilih-vendor",
      title: "Bagaimana cara memilih vendor yang aman?",
      content:
        "Saya sedang mencari vendor untuk membuat landing page. Apa saja indikator vendor yang terpercaya di marketplace?",
      authorId: buyer.id,
      status: "PUBLISHED",
      createdAt: daysAgo(5),
    },
  });

  const listingPost = await db.forumPost.create({
    data: {
      slug: "forum-optimasi-listing-seller",
      title: "Tips agar listing seller lebih mudah ditemukan",
      content:
        "Saya ingin berbagi pengalaman menulis judul, deskripsi, dan thumbnail listing supaya lebih mudah dipahami buyer.",
      authorId: seller.id,
      status: "PUBLISHED",
      createdAt: daysAgo(4),
    },
  });

  const watchedPost = await db.forumPost.create({
    data: {
      slug: "forum-diskusi-anti-spam",
      title: "Kenapa komentar saya terkena anti-spam?",
      content:
        "Saya sempat mengirim komentar yang sama beberapa kali. Apakah ada batas posting forum dalam beberapa menit?",
      authorId: watched.id,
      status: "PUBLISHED",
      createdAt: daysAgo(2),
    },
  });

  const removedPost = await db.forumPost.create({
    data: {
      slug: "forum-spam-promosi-dihapus",
      title: "Promo cepat kaya tanpa modal",
      content:
        "Posting ini menjadi contoh konten spam yang sudah dihapus moderator untuk pengujian halaman moderasi.",
      authorId: banned.id,
      status: "REMOVED",
      createdAt: daysAgo(1),
    },
  });

  const repeatedViolationPost = await db.forumPost.create({
    data: {
      slug: "forum-pelanggaran-berulang",
      title: "Posting pelanggaran berulang",
      content:
        "Contoh post dari user yang sudah menerima tiga strike dan otomatis diblokir dari forum.",
      authorId: banned.id,
      status: "REMOVED",
      createdAt: daysAgo(1),
    },
  });

  const comments = await Promise.all([
    db.forumComment.create({
      data: {
        postId: vendorPost.id,
        authorId: seller.id,
        content:
          "Cek portofolio, rating, kejelasan scope, dan riwayat komunikasi sebelum memilih vendor.",
        createdAt: daysAgo(5),
      },
    }),
    db.forumComment.create({
      data: {
        postId: vendorPost.id,
        authorId: watched.id,
        content:
          "Saya biasanya minta milestone kecil dulu sebelum proyek besar dimulai.",
        createdAt: daysAgo(4),
      },
    }),
    db.forumComment.create({
      data: {
        postId: listingPost.id,
        authorId: buyer.id,
        content:
          "Sebagai buyer, thumbnail dan deskripsi singkat sangat membantu saat membandingkan listing.",
        createdAt: daysAgo(3),
      },
    }),
    db.forumComment.create({
      data: {
        postId: watchedPost.id,
        authorId: seller.id,
        content:
          "Anti-spam biasanya aktif untuk mencegah post duplikat dan komentar terlalu cepat.",
        createdAt: daysAgo(2),
      },
    }),
    db.forumComment.create({
      data: {
        postId: removedPost.id,
        authorId: banned.id,
        content: "Komentar duplikat untuk contoh pelanggaran forum.",
        status: "REMOVED",
        createdAt: daysAgo(1),
      },
    }),
  ]);

  await Promise.all([
    db.forumLike.create({ data: { postId: vendorPost.id, userId: seller.id } }),
    db.forumLike.create({ data: { postId: vendorPost.id, userId: watched.id } }),
    db.forumLike.create({ data: { postId: listingPost.id, userId: buyer.id } }),
    db.forumLike.create({ data: { postId: watchedPost.id, userId: buyer.id } }),
  ]);

  await Promise.all([
    db.forumStrike.create({
      data: {
        userId: watched.id,
        moderatorId: moderator.id,
        postId: watchedPost.id,
        reason: "Mengirim pertanyaan yang sama berulang kali dalam waktu singkat.",
        createdAt: daysAgo(2),
      },
    }),
    db.forumStrike.create({
      data: {
        userId: watched.id,
        moderatorId: moderator.id,
        commentId: comments[1].id,
        reason: "Komentar berulang dan tidak relevan dengan topik diskusi.",
        createdAt: daysAgo(1),
      },
    }),
    db.forumStrike.create({
      data: {
        userId: banned.id,
        moderatorId: moderator.id,
        postId: removedPost.id,
        reason: "Promosi spam di forum.",
        createdAt: daysAgo(3),
      },
    }),
    db.forumStrike.create({
      data: {
        userId: banned.id,
        moderatorId: moderator.id,
        commentId: comments[4].id,
        reason: "Komentar duplikat setelah peringatan moderator.",
        createdAt: daysAgo(2),
      },
    }),
    db.forumStrike.create({
      data: {
        userId: banned.id,
        moderatorId: moderator.id,
        postId: repeatedViolationPost.id,
        reason: "Pelanggaran berulang setelah dua strike sebelumnya.",
        createdAt: daysAgo(1),
      },
    }),
  ]);

  await prisma.user.update({
    where: { id: banned.id },
    data: {
      isForumBanned: true,
      forumBannedAt: daysAgo(1),
      forumBannedReason:
        "Diblokir permanen setelah menerima tiga strike forum.",
    },
  });

  console.log("Forum dummy data created with existing users.");
  console.table([
    { role: "moderator", email: moderator.email },
    { role: "buyer", email: buyer.email },
    { role: "seller", email: seller.email },
    { role: "2 strikes", email: watched.email },
    { role: "3 strikes / forum banned", email: banned.email },
  ]);
}

// Jalankan langsung hanya ketika file ini dieksekusi sebagai script utama.
if (require.main === module) {
  seedForum()
    .catch((error) => {
      console.error("Failed to seed forum dummy data.");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
