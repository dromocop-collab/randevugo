"use client";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export default function SuperAdminSupportPage() {
  return (
    <Card title="Destek Talepleri" description="Platform genelindeki destek talepleri">
      <EmptyState
        title="Henüz destek talebi yok"
        description="İşletmeler destek talebi oluşturduğunda burada listelenecek."
      />
    </Card>
  );
}
