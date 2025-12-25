declare module "qrcode" {
  type QrCodeModules = {
    size: number;
    data: boolean[];
  };

  type QrCodeData = {
    modules: QrCodeModules;
  };

  type QrCodeOptions = {
    errorCorrectionLevel?: string;
  };

  const QRCode: {
    create: (value: string, options?: QrCodeOptions) => QrCodeData;
  };

  export default QRCode;
}
