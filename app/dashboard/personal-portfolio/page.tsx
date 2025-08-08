import { Suspense } from 'react';
import PersonalPortfolioClient from './personal-portfolio-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div />}>
      <PersonalPortfolioClient />
    </Suspense>
  );
}
