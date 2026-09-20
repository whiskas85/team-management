/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Sopra il tetto dei file (20 MB), e non per caso: quando è Next a
    // fermare la richiesta non torna un errore leggibile, torna un 413 che il
    // browser non sa interpretare e la pagina finisce su «Qualcosa si è
    // rotto». A dire «è troppo grande» dev'essere sempre il gestionale, quindi
    // questo muro sta più in là di quello che controlliamo noi.
    serverActions: { bodySizeLimit: '25mb' },
  },
};
export default nextConfig;
