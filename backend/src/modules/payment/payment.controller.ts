import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";
import {
  UploadPaymentProofDto,
  VerifyPaymentProofDto,
  RequestWithdrawalDto,
  CreatePaymentAccountDto,
  UpdatePaymentAccountDto,
} from "./payment.dto";
import { CreatePlatformPaymentAccountDto, UpdatePlatformPaymentAccountDto } from "./platform-payment-account.dto";

@Controller("api/payment")
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // ============================================
  // SELLER: Balance, transactions, withdrawals
  // ============================================

  @Get("balance")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getSellerBalance(@GetUser("id") userId: string) {
    return this.paymentService.getSellerBalance(userId);
  }

  @Get("transactions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getSellerTransactions(
    @GetUser("id") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
    @Query("type") type?: string,
  ) {
    return this.paymentService.getSellerTransactions(userId, +page, +limit, type);
  }

  @Post("withdraw")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  requestWithdrawal(
    @GetUser("id") userId: string,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.paymentService.requestWithdrawal(userId, dto);
  }

  @Get("withdrawals")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getSellerWithdrawals(
    @GetUser("id") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.paymentService.getSellerWithdrawals(userId, +page, +limit);
  }

  // ============================================
  // BUYER: Get payment accounts (full numbers for transfer)
  // ============================================

  @Get("accounts")
  @UseGuards(JwtAuthGuard)
  getPaymentAccounts(@Query("tenantId") tenantId?: string) {
    return this.paymentService.getPaymentAccounts(tenantId);
  }

  // ============================================
  // BUYER: Upload payment proof
  // ============================================

  @Post("proof/upload")
  @UseGuards(JwtAuthGuard)
  uploadPaymentProof(
    @GetUser("id") userId: string,
    @Body() dto: UploadPaymentProofDto,
  ) {
    return this.paymentService.uploadPaymentProof(dto.orderId, userId, {
      ...dto,
      transactionDate: dto.transactionDate
        ? new Date(dto.transactionDate)
        : undefined,
    });
  }

  // ============================================
  // ADMIN: Verify/reject payment proof
  // ============================================

  @Put("proof/:id/verify")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  verifyPaymentProof(
    @Param("id") proofId: string,
    @GetUser("id") userId: string,
    @Body() dto: VerifyPaymentProofDto,
  ) {
    return this.paymentService.verifyPaymentProof(
      proofId,
      userId,
      dto.action,
      dto.reason,
    );
  }

  @Get("proof/pending")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPendingPaymentProofs(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.paymentService.getPendingPaymentProofs(+page, +limit);
  }

  @Get("admin/proofs")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAllPaymentProofs(
    @Query("page") page = 1,
    @Query("limit") limit = 50,
    @Query("status") status?: string,
  ) {
    return this.paymentService.getAllPaymentProofs(+page, +limit, status);
  }

  @Get("proof/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPaymentProofDetail(@Param("id") proofId: string) {
    return this.paymentService.getPaymentProofDetail(proofId);
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getPaymentStats() {
    return this.paymentService.getPaymentStats();
  }

  // ============================================
  // SUPER ADMIN: Payment Account CRUD
  // ============================================

  @Get("admin/accounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getAllPaymentAccounts(
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.paymentService.getAllPaymentAccounts(+page, +limit);
  }

  @Post("admin/accounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  createPaymentAccount(@Body() dto: CreatePaymentAccountDto) {
    return this.paymentService.createPaymentAccount(dto);
  }

  @Put("admin/accounts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updatePaymentAccount(
    @Param("id") id: string,
    @Body() dto: UpdatePaymentAccountDto,
  ) {
    return this.paymentService.updatePaymentAccount(id, dto);
  }

  @Delete("admin/accounts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  deletePaymentAccount(@Param("id") id: string) {
    return this.paymentService.deletePaymentAccount(id);
  }

  // ============================================
  // ADMIN: Platform Payment Accounts (Rekening Plazo)
  // ============================================

  @Get("admin/platform-accounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getPlatformPaymentAccounts() {
    return this.paymentService.getPlatformPaymentAccounts();
  }

  @Post("admin/platform-accounts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  createPlatformPaymentAccount(@Body() dto: CreatePlatformPaymentAccountDto) {
    return this.paymentService.createPlatformPaymentAccount(dto);
  }

  @Put("admin/platform-accounts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updatePlatformPaymentAccount(
    @Param("id") id: string,
    @Body() dto: UpdatePlatformPaymentAccountDto,
  ) {
    return this.paymentService.updatePlatformPaymentAccount(id, dto);
  }

  @Delete("admin/platform-accounts/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  deletePlatformPaymentAccount(@Param("id") id: string) {
    return this.paymentService.deletePlatformPaymentAccount(id);
  }
}
