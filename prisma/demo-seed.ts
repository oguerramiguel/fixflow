import { createHash } from "node:crypto";
import { EquipmentType, Prisma, QuoteStatus, ServiceOrderStatus, UserRole } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { prisma } from "../src/server/db/prisma";
import { getDemoSeedConfig } from "../src/server/demo/demo-seed-config";

const PUBLIC_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function stableSuffix(value: string, length = 16): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, length);
}

function stablePublicCode(value: string): string {
  const bytes = createHash("sha256").update(value, "utf8").digest();
  const body = Array.from(
    { length: 10 },
    (_unused, index) => PUBLIC_CODE_ALPHABET[bytes[index] % PUBLIC_CODE_ALPHABET.length]
  ).join("");

  return `FF-${body}`;
}

async function assertEmailsAreAvailable(
  organizationId: string,
  emails: string[]
): Promise<void> {
  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: emails
      }
    },
    select: {
      organizationId: true
    }
  });

  if (existingUsers.some((user) => user.organizationId !== organizationId)) {
    throw new Error(
      "A configured demo email already belongs to another Organization."
    );
  }
}

async function main(): Promise<void> {
  const config = getDemoSeedConfig();
  const suffix = stableSuffix(config.organizationSlug);
  const [ownerPasswordHash, technicianPasswordHash] = await Promise.all([
    hashPassword(config.ownerPassword),
    hashPassword(config.technicianPassword)
  ]);
  const organization = await prisma.organization.upsert({
    where: {
      slug: config.organizationSlug
    },
    update: {
      name: config.organizationName
    },
    create: {
      id: `demo_org_${suffix}`,
      name: config.organizationName,
      slug: config.organizationSlug
    }
  });

  await assertEmailsAreAvailable(organization.id, [
    config.ownerEmail,
    config.technicianEmail
  ]);

  await prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({
      where: {
        email: config.ownerEmail
      },
      update: {
        organizationId: organization.id,
        name: config.ownerName,
        passwordHash: ownerPasswordHash,
        role: UserRole.OWNER,
        disabledAt: null
      },
      create: {
        id: `demo_owner_${suffix}`,
        organizationId: organization.id,
        name: config.ownerName,
        email: config.ownerEmail,
        passwordHash: ownerPasswordHash,
        role: UserRole.OWNER
      }
    });
    await transaction.user.upsert({
      where: {
        email: config.technicianEmail
      },
      update: {
        organizationId: organization.id,
        name: config.technicianName,
        passwordHash: technicianPasswordHash,
        role: UserRole.TECHNICIAN,
        disabledAt: null
      },
      create: {
        id: `demo_tech_${suffix}`,
        organizationId: organization.id,
        name: config.technicianName,
        email: config.technicianEmail,
        passwordHash: technicianPasswordHash,
        role: UserRole.TECHNICIAN
      }
    });

    const customers = [
      {
        id: `demo_customer_a_${suffix}`,
        name: "Cliente Ficticio Aurora",
        email: "aurora@customer.invalid",
        phone: "+55 11 0000-0001"
      },
      {
        id: `demo_customer_b_${suffix}`,
        name: "Cliente Ficticio Horizonte",
        email: "horizonte@customer.invalid",
        phone: "+55 11 0000-0002"
      }
    ];

    for (const customer of customers) {
      await transaction.customer.upsert({
        where: {
          id_organizationId: {
            id: customer.id,
            organizationId: organization.id
          }
        },
        update: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          document: null
        },
        create: {
          ...customer,
          organizationId: organization.id
        }
      });
    }

    const equipment = [
      {
        id: `demo_equipment_a_${suffix}`,
        customerId: customers[0].id,
        type: EquipmentType.NOTEBOOK,
        brand: "Marca Ficticia",
        model: "Notebook Demo A",
        serialNumber: `DEMO-A-${suffix}`
      },
      {
        id: `demo_equipment_b_${suffix}`,
        customerId: customers[1].id,
        type: EquipmentType.DESKTOP,
        brand: "Marca Ficticia",
        model: "Desktop Demo B",
        serialNumber: `DEMO-B-${suffix}`
      }
    ];

    for (const item of equipment) {
      await transaction.equipment.upsert({
        where: {
          id_organizationId: {
            id: item.id,
            organizationId: organization.id
          }
        },
        update: {
          customerId: item.customerId,
          type: item.type,
          brand: item.brand,
          model: item.model,
          serialNumber: item.serialNumber,
          accessories: "Dados demonstrativos; nenhum item real.",
          notes: "Registro ficticio criado pelo seed demo explicito."
        },
        create: {
          ...item,
          organizationId: organization.id,
          accessories: "Dados demonstrativos; nenhum item real.",
          notes: "Registro ficticio criado pelo seed demo explicito."
        }
      });
    }

    const serviceOrders = [
      {
        id: `demo_order_a_${suffix}`,
        customerId: customers[0].id,
        equipmentId: equipment[0].id,
        publicCode: stablePublicCode(`${suffix}-order-a`),
        reportedIssue: "Equipamento ficticio nao inicia para a demonstracao.",
        status: ServiceOrderStatus.WAITING_FOR_APPROVAL
      },
      {
        id: `demo_order_b_${suffix}`,
        customerId: customers[1].id,
        equipmentId: equipment[1].id,
        publicCode: stablePublicCode(`${suffix}-order-b`),
        reportedIssue: "Equipamento ficticio apresenta ruido para a demonstracao.",
        status: ServiceOrderStatus.RECEIVED
      }
    ];

    for (const order of serviceOrders) {
      const existingOrder = await transaction.serviceOrder.findUnique({
        where: {
          publicCode: order.publicCode
        },
        select: {
          id: true,
          organizationId: true
        }
      });

      if (
        existingOrder &&
        (existingOrder.organizationId !== organization.id ||
          existingOrder.id !== order.id)
      ) {
        throw new Error(
          "A generated demo public code collides with an existing ServiceOrder."
        );
      }

      const persistedOrder = await transaction.serviceOrder.upsert({
        where: {
          publicCode: order.publicCode
        },
        update: {
          organizationId: organization.id,
          customerId: order.customerId,
          equipmentId: order.equipmentId,
          reportedIssue: order.reportedIssue,
          status: order.status
        },
        create: {
          ...order,
          organizationId: organization.id
        }
      });
      await transaction.serviceOrderTimeline.upsert({
        where: {
          id_organizationId: {
            id: `${order.id}_created`,
            organizationId: organization.id
          }
        },
        update: {
          serviceOrderId: persistedOrder.id,
          type: "SERVICE_ORDER_CREATED",
          description: "Ordem de servico ficticia criada pelo seed demo."
        },
        create: {
          id: `${order.id}_created`,
          organizationId: organization.id,
          serviceOrderId: persistedOrder.id,
          type: "SERVICE_ORDER_CREATED",
          description: "Ordem de servico ficticia criada pelo seed demo."
        }
      });
    }

    const diagnosticId = `demo_diagnostic_${suffix}`;
    await transaction.diagnostic.upsert({
      where: {
        serviceOrderId_organizationId: {
          serviceOrderId: serviceOrders[0].id,
          organizationId: organization.id
        }
      },
      update: {
        description: "Diagnostico ficticio: componente de energia para demonstracao.",
        technicalNotes: "Notas estritamente demonstrativas."
      },
      create: {
        id: diagnosticId,
        organizationId: organization.id,
        serviceOrderId: serviceOrders[0].id,
        description: "Diagnostico ficticio: componente de energia para demonstracao.",
        technicalNotes: "Notas estritamente demonstrativas."
      }
    });
    const quoteId = `demo_quote_${suffix}`;
    const quote = await transaction.quote.upsert({
      where: {
        serviceOrderId_organizationId: {
          serviceOrderId: serviceOrders[0].id,
          organizationId: organization.id
        }
      },
      update: {
        status: QuoteStatus.SENT
      },
      create: {
        id: quoteId,
        organizationId: organization.id,
        serviceOrderId: serviceOrders[0].id,
        status: QuoteStatus.SENT
      }
    });
    await transaction.quoteItem.upsert({
      where: {
        id_organizationId: {
          id: `demo_quote_item_${suffix}`,
          organizationId: organization.id
        }
      },
      update: {
        quoteId: quote.id,
        description: "Servico ficticio de manutencao",
        quantity: 1,
        unitPrice: new Prisma.Decimal("199.90")
      },
      create: {
        id: `demo_quote_item_${suffix}`,
        organizationId: organization.id,
        quoteId: quote.id,
        description: "Servico ficticio de manutencao",
        quantity: 1,
        unitPrice: new Prisma.Decimal("199.90")
      }
    });
  });

  console.log(
    JSON.stringify(
      {
        operation: "demo_seed",
        status: "ok",
        environment: config.environment,
        organizationSlug: config.organizationSlug,
        counts: {
          users: 2,
          customers: 2,
          equipment: 2,
          serviceOrders: 2,
          diagnostics: 1,
          quotes: 1,
          quoteItems: 1
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Demo seed failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
