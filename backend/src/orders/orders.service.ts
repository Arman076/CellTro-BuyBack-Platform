import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma/prisma.service.js";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePhone(phone: unknown) {
    return String(phone ?? "").replace(/\D/g, "");
  }

  private validateIndianPhone(phone: string) {
    return /^[6-9]\d{9}$/.test(phone);
  }

  private addressType(type: unknown) {
    const value = String(type || "").toUpperCase();
    if (!["HOME", "OFFICE", "OTHER"].includes(value)) {
      throw new BadRequestException("Invalid address type.");
    }
    return value as "HOME" | "OFFICE" | "OTHER";
  }

  private dateOnly(value: unknown) {
    const raw = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      throw new BadRequestException("Invalid pickup date.");
    }
    return new Date(`${raw}T00:00:00.000Z`);
  }

  private orderNumber() {
    const date = new Date();
    const ymd = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("");
    const tail = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`.toUpperCase();
    return `CEL-${ymd}-${tail}`;
  }

  private async ensureDefaultSlots() {
    const defaults = [
      {
        code: "10_14",
        label: "10:00 AM - 02:00 PM",
        startTime: "10:00",
        endTime: "14:00",
        displayOrder: 10,
      },
      {
        code: "14_18",
        label: "02:00 PM - 06:00 PM",
        startTime: "14:00",
        endTime: "18:00",
        displayOrder: 20,
      },
      {
        code: "18_22",
        label: "06:00 PM - 10:00 PM",
        startTime: "18:00",
        endTime: "22:00",
        displayOrder: 30,
      },
    ];

    await Promise.all(
      defaults.map((slot) =>
        this.prisma.pickupSlotTemplate.upsert({
          where: { code: slot.code },
          update: {},
          create: slot,
        }),
      ),
    );
  }

  async getPickupSlots() {
    await this.ensureDefaultSlots();

    return this.prisma.pickupSlotTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      select: {
        id: true,
        code: true,
        label: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async getCustomerAddresses(phoneInput: unknown) {
    const phone = this.normalizePhone(phoneInput);

    if (!this.validateIndianPhone(phone)) {
      throw new BadRequestException("Valid verified mobile number is required.");
    }

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      include: {
        addresses: {
          where: { isActive: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!customer) return [];

    return customer.addresses.map((address) => ({
      ...address,
      type:
        address.type === "HOME"
          ? "Home"
          : address.type === "OFFICE"
            ? "Office"
            : "Other",
      serviceable: true,
    }));
  }

  async createCustomerAddress(body: any) {
    const phone = this.normalizePhone(body?.phone);

    if (!this.validateIndianPhone(phone)) {
      throw new BadRequestException("Valid verified mobile number is required.");
    }

    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    const address = await this.prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        fullName: String(body?.fullName || "").trim(),
        house: String(body?.house || "").trim(),
        street: String(body?.street || "").trim(),
        locality: String(body?.locality || "").trim(),
        landmark: String(body?.landmark || "").trim() || null,
        pincode: String(body?.pincode || "").trim(),
        city: String(body?.city || "").trim(),
        state: String(body?.state || "").trim(),
        type: this.addressType(body?.type),
      },
    });

    return {
      ...address,
      type:
        address.type === "HOME"
          ? "Home"
          : address.type === "OFFICE"
            ? "Office"
            : "Other",
      phone,
      serviceable: true,
    };
  }

  async updateCustomerAddress(id: number, body: any) {
    const phone = this.normalizePhone(body?.phone);

    if (!this.validateIndianPhone(phone)) {
      throw new BadRequestException("Valid verified mobile number is required.");
    }

    const existing = await this.prisma.customerAddress.findFirst({
      where: {
        id,
        customer: { phone },
        isActive: true,
      },
    });

    if (!existing) throw new NotFoundException("Address not found.");

    const address = await this.prisma.customerAddress.update({
      where: { id },
      data: {
        fullName: String(body?.fullName || "").trim(),
        house: String(body?.house || "").trim(),
        street: String(body?.street || "").trim(),
        locality: String(body?.locality || "").trim(),
        landmark: String(body?.landmark || "").trim() || null,
        pincode: String(body?.pincode || "").trim(),
        city: String(body?.city || "").trim(),
        state: String(body?.state || "").trim(),
        type: this.addressType(body?.type),
      },
    });

    return {
      ...address,
      type:
        address.type === "HOME"
          ? "Home"
          : address.type === "OFFICE"
            ? "Office"
            : "Other",
      phone,
      serviceable: true,
    };
  }

  async deleteCustomerAddress(id: number, phoneInput: unknown) {
    const phone = this.normalizePhone(phoneInput);

    const existing = await this.prisma.customerAddress.findFirst({
      where: {
        id,
        customer: { phone },
        isActive: true,
      },
    });

    if (!existing) throw new NotFoundException("Address not found.");

    await this.prisma.customerAddress.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  async createOrder(body: any) {
    const phone = this.normalizePhone(body?.phone);

    if (!this.validateIndianPhone(phone)) {
      throw new BadRequestException("Valid verified mobile number is required.");
    }

    const addressId = Number(body?.addressId);
    const pickupDate = this.dateOnly(body?.pickupDate);
    const slotCode = String(body?.pickupSlotCode || "");
    const payoutMethod = String(body?.payoutMethod || "").toUpperCase();
    const quote = body?.quote;

    if (!["CASH", "UPI"].includes(payoutMethod)) {
      throw new BadRequestException("Select Cash or UPI payout.");
    }

    const payoutUpiMobile =
      payoutMethod === "UPI"
        ? this.normalizePhone(body?.payoutUpiMobile)
        : null;

    if (
      payoutMethod === "UPI" &&
      !this.validateIndianPhone(payoutUpiMobile || "")
    ) {
      throw new BadRequestException("Valid UPI-linked mobile number is required.");
    }

    if (
      !quote ||
      !Number.isFinite(Number(quote.productId)) ||
      !Number.isFinite(Number(quote.variantId)) ||
      !Number.isFinite(Number(quote.finalPrice))
    ) {
      throw new BadRequestException("Valid quote details are required.");
    }

    await this.ensureDefaultSlots();

    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: {},
      create: { phone },
    });

    const [address, slot] = await Promise.all([
      this.prisma.customerAddress.findFirst({
        where: {
          id: addressId,
          customerId: customer.id,
          isActive: true,
        },
      }),
      this.prisma.pickupSlotTemplate.findFirst({
        where: {
          code: slotCode,
          isActive: true,
        },
      }),
    ]);

    if (!address) throw new BadRequestException("Selected address is invalid.");
    if (!slot) throw new BadRequestException("Selected pickup slot is invalid.");

    const orderNumber = this.orderNumber();

    const order = await this.prisma.sellOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,

        // Snapshot product/quote data. Existing Product/Variant tables are untouched.
        productId: Number(quote.productId),
        variantId: Number(quote.variantId),
        productName: String(quote.productName || "Device"),
        productImage: quote.productImage ? String(quote.productImage) : null,
        variantLabel: String(quote.variantLabel || ""),
        basePrice: Number(quote.basePrice || 0),
        totalDeduction: Number(quote.totalDeduction || 0),
        finalPrice: Number(quote.finalPrice || 0),
        questionnaireSnapshot: quote.questionnaireSnapshot ?? undefined,

        pickupDate,
        pickupSlotId: slot.id,
        payoutMethod: payoutMethod as "CASH" | "UPI",
        payoutUpiMobile,

        addressSnapshot: {
          create: {
            sourceAddressId: address.id,
            fullName: address.fullName,
            phone,
            house: address.house,
            street: address.street,
            locality: address.locality,
            landmark: address.landmark,
            pincode: address.pincode,
            city: address.city,
            state: address.state,
            type: address.type,
          },
        },

        statusHistory: {
          create: {
            status: "PICKUP_REQUESTED",
            note: "Pickup request created by customer.",
          },
        },
      },
      include: {
        pickupSlot: true,
        addressSnapshot: true,
        statusHistory: true,
        reschedules: true,
      },
    });

    return this.toOrderView(order);
  }

  async getOrder(orderNumber: string) {
    const order = await this.prisma.sellOrder.findUnique({
      where: { orderNumber },
      include: {
        pickupSlot: true,
        addressSnapshot: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
        reschedules: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) throw new NotFoundException("Order not found.");
    return this.toOrderView(order);
  }

  async rescheduleOrder(orderNumber: string, body: any) {
    const pickupDate = this.dateOnly(body?.pickupDate);
    const slotCode = String(body?.pickupSlotCode || "");

    const [order, slot] = await Promise.all([
      this.prisma.sellOrder.findUnique({
        where: { orderNumber },
        include: { pickupSlot: true },
      }),
      this.prisma.pickupSlotTemplate.findFirst({
        where: { code: slotCode, isActive: true },
      }),
    ]);

    if (!order) throw new NotFoundException("Order not found.");
    if (!slot) throw new BadRequestException("Pickup slot not found.");

    if (["COMPLETED", "CANCELLED"].includes(order.status)) {
      throw new BadRequestException("This order can no longer be rescheduled.");
    }

    await this.prisma.$transaction([
      this.prisma.orderRescheduleHistory.create({
        data: {
          orderId: order.id,
          oldPickupDate: order.pickupDate,
          newPickupDate: pickupDate,
          oldSlotLabel: order.pickupSlot.label,
          newSlotLabel: slot.label,
        },
      }),
      this.prisma.sellOrder.update({
        where: { id: order.id },
        data: {
          pickupDate,
          pickupSlotId: slot.id,
        },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: `Pickup rescheduled to ${slot.label}.`,
        },
      }),
    ]);

    return this.getOrder(orderNumber);
  }

  async cancelOrder(orderNumber: string) {
    const order = await this.prisma.sellOrder.findUnique({
      where: { orderNumber },
    });

    if (!order) throw new NotFoundException("Order not found.");

    if (order.status === "COMPLETED") {
      throw new BadRequestException("Completed order cannot be cancelled.");
    }

    if (order.status !== "CANCELLED") {
      await this.prisma.sellOrder.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          statusHistory: {
            create: {
              status: "CANCELLED",
              note: "Pickup request cancelled by customer.",
            },
          },
        },
      });
    }

    return this.getOrder(orderNumber);
  }

  private toOrderView(order: any) {
    const address = order.addressSnapshot;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      productId: order.productId,
      variantId: order.variantId,
      productName: order.productName,
      productImage: order.productImage,
      variantLabel: order.variantLabel,
      basePrice: Number(order.basePrice),
      totalDeduction: Number(order.totalDeduction),
      finalPrice: Number(order.finalPrice),
      pickupDate: order.pickupDate,
      pickupSlot: {
        code: order.pickupSlot.code,
        label: order.pickupSlot.label,
      },
      payoutMethod: order.payoutMethod,
      payoutUpiMobile: order.payoutUpiMobile,
      address: address
        ? {
            fullName: address.fullName,
            phone: address.phone,
            house: address.house,
            street: address.street,
            locality: address.locality,
            landmark: address.landmark,
            pincode: address.pincode,
            city: address.city,
            state: address.state,
            type:
              address.type === "HOME"
                ? "Home"
                : address.type === "OFFICE"
                  ? "Office"
                  : "Other",
          }
        : null,
      statusHistory: (order.statusHistory || []).map((item: any) => ({
        id: item.id,
        status: item.status,
        note: item.note,
        createdAt: item.createdAt,
      })),
      reschedules: (order.reschedules || []).map((item: any) => ({
        id: item.id,
        oldPickupDate: item.oldPickupDate,
        newPickupDate: item.newPickupDate,
        oldSlotLabel: item.oldSlotLabel,
        newSlotLabel: item.newSlotLabel,
        createdAt: item.createdAt,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
