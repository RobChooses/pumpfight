import TokenDetailPage from '@/components/TokenDetailPage';

interface TokenPageProps {
  params: {
    address: string;
  };
}

export default function TokenPage({ params }: TokenPageProps) {
  return <TokenDetailPage tokenAddress={params.address} />;
}