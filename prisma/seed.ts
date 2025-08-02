import { PrismaClient, Role, ProjectStatus, Priority, SnagStatus, PhotoSize } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create test users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@snagio.com' },
    update: {},
    create: {
      email: 'admin@snagio.com',
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      company: 'Snagio Demo',
    },
  })

  const inspectorUser = await prisma.user.upsert({
    where: { email: 'inspector@snagio.com' },
    update: {},
    create: {
      email: 'inspector@snagio.com',
      firstName: 'John',
      lastName: 'Inspector',
      role: Role.INSPECTOR,
      company: 'Quality Inspections Ltd',
      phone: '+1234567890',
    },
  })

  const contractorUser = await prisma.user.upsert({
    where: { email: 'contractor@snagio.com' },
    update: {},
    create: {
      email: 'contractor@snagio.com',
      firstName: 'Sarah',
      lastName: 'Builder',
      role: Role.CONTRACTOR,
      company: 'ABC Construction',
    },
  })

  // Create a demo project
  const demoProject = await prisma.project.create({
    data: {
      code: 'DEMO-001',
      name: 'Marina Bay Residences',
      description: 'Luxury waterfront apartment complex with 120 units',
      address: '123 Marina Bay Drive, Waterfront District',
      clientName: 'Marina Bay Developments',
      contractorName: 'ABC Construction',
      startDate: new Date('2024-01-01'),
      expectedEndDate: new Date('2024-12-31'),
      status: ProjectStatus.ACTIVE,
      createdById: adminUser.id,
      settings: {
        create: {
          itemLabel: 'Snag',
          numberLabel: 'No.',
          locationLabel: 'Location',
          photoLabel: 'Photo',
          descriptionLabel: 'Description',
          solutionLabel: 'Solution',
          statusLabel: 'STATUS',
          photoSize: PhotoSize.LARGE,
          rowsPerPage: 5,
        },
      },
      categories: {
        create: [
          {
            name: 'Entrance & Lobby',
            code: 'ENT',
            description: 'Main entrance and lobby areas',
            orderIndex: 1,
          },
          {
            name: 'Living Areas',
            code: 'LIV',
            description: 'Living rooms and common areas',
            orderIndex: 2,
          },
          {
            name: 'Kitchen',
            code: 'KIT',
            description: 'Kitchen and pantry areas',
            orderIndex: 3,
          },
          {
            name: 'Master Bedroom',
            code: 'MBR',
            description: 'Master bedroom and en-suite',
            orderIndex: 4,
          },
          {
            name: 'Bathrooms',
            code: 'BTH',
            description: 'All bathroom areas',
            orderIndex: 5,
          },
          {
            name: 'Balcony & Outdoor',
            code: 'BAL',
            description: 'Balconies and outdoor spaces',
            orderIndex: 6,
          },
        ],
      },
    },
    include: {
      categories: true,
      settings: true,
    },
  })

  // Create some sample snags
  const entranceCategory = demoProject.categories.find(c => c.code === 'ENT')!
  const kitchenCategory = demoProject.categories.find(c => c.code === 'KIT')!

  await prisma.snag.createMany({
    data: [
      {
        number: 1,
        categoryId: entranceCategory.id,
        location: 'Main entrance door frame',
        description: 'Paint chipped on door frame, needs touch-up',
        solution: 'Sand and repaint door frame with matching color',
        status: SnagStatus.OPEN,
        priority: Priority.MEDIUM,
        createdById: inspectorUser.id,
      },
      {
        number: 2,
        categoryId: entranceCategory.id,
        location: 'Lobby ceiling',
        description: 'Water stain visible on ceiling near light fixture',
        solution: 'Check for leaks, repair and repaint ceiling',
        status: SnagStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        createdById: inspectorUser.id,
        assignedToId: contractorUser.id,
      },
      {
        number: 1,
        categoryId: kitchenCategory.id,
        location: 'Kitchen cabinet door',
        description: 'Cabinet door not aligned properly, gaps visible',
        solution: 'Adjust hinges and realign cabinet door',
        status: SnagStatus.OPEN,
        priority: Priority.LOW,
        createdById: inspectorUser.id,
      },
    ],
  })

  console.log('✅ Seed completed successfully!')
  console.log(`Created project: ${demoProject.name} (${demoProject.code})`)
  console.log(`Created ${demoProject.categories.length} categories`)
  console.log('Created 3 sample snags')
  console.log('\nTest credentials:')
  console.log('Admin: admin@snagio.com')
  console.log('Inspector: inspector@snagio.com')
  console.log('Contractor: contractor@snagio.com')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })