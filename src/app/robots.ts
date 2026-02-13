import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/paciente/'],
        },
        sitemap: 'https://clinicadornelles.com.br/sitemap.xml',
    };
}
