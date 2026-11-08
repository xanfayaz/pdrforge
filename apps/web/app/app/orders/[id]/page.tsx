'use client';

import { useParams } from 'next/navigation';
import { OrderEditor } from '@/components/order-editor';

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  return <OrderEditor id={params.id} />;
}
