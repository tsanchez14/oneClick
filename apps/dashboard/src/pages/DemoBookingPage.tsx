import { DemoProvider } from '../contexts/DemoContext';
import { DemoDataProvider } from '../providers/DemoDataProvider';
import PublicBookingPage from './PublicBookingPage';

export default function DemoBookingPage() {
  return (
    <DemoProvider>
      <DemoDataProvider>
        <PublicBookingPage demoSlug="demo" />
      </DemoDataProvider>
    </DemoProvider>
  );
}
