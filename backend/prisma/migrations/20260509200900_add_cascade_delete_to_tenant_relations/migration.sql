-- AlterTable: Add CASCADE DELETE to Product.tenantId foreign key
ALTER TABLE "Product" DROP CONSTRAINT "Product_tenantId_fkey";
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add CASCADE DELETE to Service.tenantId foreign key
ALTER TABLE "Service" DROP CONSTRAINT "Service_tenantId_fkey";
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add CASCADE DELETE to Job.tenantId foreign key
ALTER TABLE "Job" DROP CONSTRAINT "Job_tenantId_fkey";
ALTER TABLE "Job" ADD CONSTRAINT "Job_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Add CASCADE DELETE to Order.tenantId foreign key
ALTER TABLE "Order" DROP CONSTRAINT "Order_tenantId_fkey";
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" 
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
