/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: { serverComponentsExternalPackages: ["pdfkit"], serverActions: { bodySizeLimit: "4mb" }, outputFileTracingIncludes: { "/api/rapor/*": ["./src/assets/NotoSans-Report.ttf"] } },
};

module.exports = nextConfig;
