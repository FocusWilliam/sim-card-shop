import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@simcard.shop' },
    update: {},
    create: {
      email: 'admin@simcard.shop',
      password: adminPassword,
      nickname: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // Create products matching the screenshot
  const products = [
    {
      name: '12G / 15天',
      nameEn: '12G / 15 days',
      dataAmount: '12G',
      validityDays: 15,
      price: 131,
      originalPrice: 145,
      sortOrder: 1,
    },
    {
      name: '10G / 30天',
      nameEn: '10G / 30 days',
      dataAmount: '10G',
      validityDays: 30,
      price: 131,
      originalPrice: 145,
      sortOrder: 2,
    },
    {
      name: '15G / 30天',
      nameEn: '15G / 30 days',
      dataAmount: '15G',
      validityDays: 30,
      price: 175,
      originalPrice: 190,
      sortOrder: 3,
    },
    {
      name: '20G / 90天',
      nameEn: '20G / 90 days',
      dataAmount: '20G',
      validityDays: 90,
      price: 230,
      originalPrice: 248,
      sortOrder: 4,
    },
    {
      name: '30G / 180天',
      nameEn: '30G / 180 days',
      dataAmount: '30G',
      validityDays: 180,
      price: 350,
      originalPrice: 375,
      sortOrder: 5,
    },
    {
      name: '50G / 365天',
      nameEn: '50G / 365 days',
      dataAmount: '50G',
      validityDays: 365,
      price: 510,
      originalPrice: 538,
      sortOrder: 6,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: `seed-${p.sortOrder}` },
      update: p,
      create: { id: `seed-${p.sortOrder}`, ...p, currency: 'CNY', stock: 100 },
    });
    console.log(`✅ Product: ${product.name} - ¥${product.price}`);

    // Seed some card inventory for each product
    const existingCards = await prisma.cardInventory.count({
      where: { productId: product.id },
    });

    if (existingCards === 0) {
      const cards = Array.from({ length: 10 }, (_, i) => ({
        productId: product.id,
        cardNumber: `SIM-${product.dataAmount}-${String(i + 1).padStart(4, '0')}`,
        cardSecret: `SECRET-${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
      }));

      await prisma.cardInventory.createMany({ data: cards });
      console.log(`   📦 Added ${cards.length} card keys`);
    }
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
