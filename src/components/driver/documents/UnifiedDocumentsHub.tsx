import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { DriverDocuments } from '../DriverDocuments';

interface UnifiedDocumentsHubProps {
  driverId: string;
  userId: string;
  isFleetDriver?: boolean;
}

export function UnifiedDocumentsHub({ driverId, userId, isFleetDriver = false }: UnifiedDocumentsHubProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Mes Documents
          </CardTitle>
          <CardDescription>
            Tous vos documents administratifs au même endroit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isFleetDriver && <DriverDocuments driverId={driverId} userId={userId} />}
        </CardContent>
      </Card>
    </div>
  );
}
