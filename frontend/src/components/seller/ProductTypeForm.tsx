"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Download, 
  Link as LinkIcon, 
  Key, 
  FileText,
  Cloud,
  Info
} from "lucide-react";

export type ProductType = 'PHYSICAL' | 'DIGITAL';

export type DigitalDeliveryMethod = 
  | 'FILE_DOWNLOAD' 
  | 'EXTERNAL_LINK' 
  | 'LICENSE_KEY' 
  | 'GOOGLE_DRIVE' 
  | 'MANUAL';

export interface DigitalProductData {
  digitalFileUrl?: string;
  digitalFileSize?: number;
  digitalFileName?: string;
  downloadLimit?: number;
  downloadExpiry?: number;
  externalLink?: string;
  accessInstructions?: string;
  licenseKey?: string;
  digitalDeliveryMethod?: DigitalDeliveryMethod;
}

interface ProductTypeFormProps {
  productType: ProductType;
  onProductTypeChange: (type: ProductType) => void;
  digitalData: DigitalProductData;
  onDigitalDataChange: (data: Partial<DigitalProductData>) => void;
  onFileUpload?: (file: File) => Promise<{ url: string; size: number; name: string }>;
  isUploading?: boolean;
}

const deliveryMethods = [
  {
    value: 'FILE_DOWNLOAD' as DigitalDeliveryMethod,
    label: 'File Download',
    icon: Download,
    description: 'Upload file yang bisa didownload pembeli'
  },
  {
    value: 'EXTERNAL_LINK' as DigitalDeliveryMethod,
    label: 'Link Eksternal',
    icon: LinkIcon,
    description: 'Link ke website atau platform lain'
  },
  {
    value: 'GOOGLE_DRIVE' as DigitalDeliveryMethod,
    label: 'Google Drive',
    icon: Cloud,
    description: 'Link Google Drive atau cloud storage'
  },
  {
    value: 'LICENSE_KEY' as DigitalDeliveryMethod,
    label: 'License Key',
    icon: Key,
    description: 'Kode lisensi atau serial number'
  },
  {
    value: 'MANUAL' as DigitalDeliveryMethod,
    label: 'Manual',
    icon: FileText,
    description: 'Kirim manual via email atau chat'
  },
];

export default function ProductTypeForm({
  productType,
  onProductTypeChange,
  digitalData,
  onDigitalDataChange,
  onFileUpload,
  isUploading = false,
}: ProductTypeFormProps) {
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onFileUpload) return;

    setUploadingFile(true);
    try {
      const result = await onFileUpload(file);
      onDigitalDataChange({
        digitalFileUrl: result.url,
        digitalFileSize: result.size,
        digitalFileName: result.name,
      });
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* Product Type Selection */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Tipe Produk
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onProductTypeChange('PHYSICAL')}
            className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              productType === 'PHYSICAL'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Package className={`h-5 w-5 ${
              productType === 'PHYSICAL' ? 'text-emerald-600' : 'text-gray-400'
            }`} />
            <div className="text-left">
              <div className={`text-sm font-medium ${
                productType === 'PHYSICAL' ? 'text-emerald-900' : 'text-gray-700'
              }`}>
                Produk Fisik
              </div>
              <div className="text-xs text-gray-500">
                Barang yang dikirim
              </div>
            </div>
            {productType === 'PHYSICAL' && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></div>
            )}
          </button>

          <button
            type="button"
            onClick={() => onProductTypeChange('DIGITAL')}
            className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              productType === 'DIGITAL'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Download className={`h-5 w-5 ${
              productType === 'DIGITAL' ? 'text-blue-600' : 'text-gray-400'
            }`} />
            <div className="text-left">
              <div className={`text-sm font-medium ${
                productType === 'DIGITAL' ? 'text-blue-900' : 'text-gray-700'
              }`}>
                Produk Digital
              </div>
              <div className="text-xs text-gray-500">
                File, link, atau akses
              </div>
            </div>
            {productType === 'DIGITAL' && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </button>
        </div>
      </div>

      {/* Digital Product Form */}
      {productType === 'DIGITAL' && (
        <>
          {/* Delivery Method Selection */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Metode Pengiriman Digital
            </h2>
            
            <div className="grid grid-cols-1 gap-3">
              {deliveryMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = digitalData.digitalDeliveryMethod === method.value;
                
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => onDigitalDataChange({ digitalDeliveryMethod: method.value })}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      isSelected ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${
                        isSelected ? 'text-blue-900' : 'text-gray-700'
                      }`}>
                        {method.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {method.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Fields Based on Delivery Method */}
          {digitalData.digitalDeliveryMethod && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Detail Produk Digital
              </h2>

              {/* FILE_DOWNLOAD */}
              {digitalData.digitalDeliveryMethod === 'FILE_DOWNLOAD' && (
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Upload File Digital
                    </label>
                    
                    {digitalData.digitalFileUrl ? (
                      <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Download className="h-5 w-5 text-green-600" />
                          <div>
                            <div className="text-sm font-medium text-green-900">
                              {digitalData.digitalFileName}
                            </div>
                            <div className="text-xs text-green-600">
                              {digitalData.digitalFileSize 
                                ? `${(digitalData.digitalFileSize / 1024 / 1024).toFixed(2)} MB`
                                : 'File uploaded'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDigitalDataChange({
                            digitalFileUrl: undefined,
                            digitalFileSize: undefined,
                            digitalFileName: undefined,
                          })}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block">
                        <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          uploadingFile
                            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                            : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                        }`}>
                          {uploadingFile ? (
                            <div className="flex flex-col items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className="text-sm font-medium text-gray-700 mt-2">
                                Mengupload file...
                              </p>
                            </div>
                          ) : (
                            <>
                              <Download className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                              <p className="text-sm font-medium text-gray-700">
                                Klik untuk upload file
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                PDF, ZIP, RAR, atau file lainnya (max 100MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          disabled={uploadingFile}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Batas Download"
                      type="number"
                      value={digitalData.downloadLimit || ''}
                      onChange={(e) => onDigitalDataChange({ 
                        downloadLimit: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      placeholder="Unlimited"
                      helperText="Kosongkan untuk unlimited"
                    />
                    <Input
                      label="Masa Berlaku (hari)"
                      type="number"
                      value={digitalData.downloadExpiry || ''}
                      onChange={(e) => onDigitalDataChange({ 
                        downloadExpiry: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      placeholder="Selamanya"
                      helperText="Kosongkan untuk selamanya"
                    />
                  </div>
                </div>
              )}

              {/* EXTERNAL_LINK or GOOGLE_DRIVE */}
              {(digitalData.digitalDeliveryMethod === 'EXTERNAL_LINK' || 
                digitalData.digitalDeliveryMethod === 'GOOGLE_DRIVE') && (
                <div className="space-y-4">
                  <Input
                    label={digitalData.digitalDeliveryMethod === 'GOOGLE_DRIVE' 
                      ? 'Link Google Drive' 
                      : 'Link Eksternal'}
                    type="url"
                    value={digitalData.externalLink || ''}
                    onChange={(e) => onDigitalDataChange({ externalLink: e.target.value })}
                    placeholder="https://..."
                    helperText="Pastikan link bisa diakses oleh pembeli"
                  />
                </div>
              )}

              {/* LICENSE_KEY */}
              {digitalData.digitalDeliveryMethod === 'LICENSE_KEY' && (
                <div className="space-y-4">
                  <Input
                    label="License Key / Serial Number"
                    value={digitalData.licenseKey || ''}
                    onChange={(e) => onDigitalDataChange({ licenseKey: e.target.value })}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    helperText="Akan dikirim ke pembeli setelah pembayaran"
                  />
                </div>
              )}

              {/* Access Instructions (for all methods) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Instruksi Akses
                </label>
                <textarea
                  value={digitalData.accessInstructions || ''}
                  onChange={(e) => onDigitalDataChange({ accessInstructions: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Berikan instruksi cara mengakses atau menggunakan produk digital ini..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Instruksi ini akan dikirim ke pembeli setelah pembayaran
                </p>
              </div>

              {/* Info Box */}
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Tips Produk Digital:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Pastikan file atau link selalu dapat diakses</li>
                    <li>Berikan instruksi yang jelas dan detail</li>
                    <li>Untuk file besar, gunakan Google Drive atau cloud storage</li>
                    <li>Update license key secara berkala jika diperlukan</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Physical Product Info */}
      {productType === 'PHYSICAL' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <Info className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-800">
              <p className="font-medium mb-1">Produk Fisik:</p>
              <p className="text-xs">
                Produk ini akan dikirim secara fisik ke alamat pembeli. 
                Pastikan stok dan informasi pengiriman sudah benar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
