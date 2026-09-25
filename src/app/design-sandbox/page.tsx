import { notFound } from 'next/navigation';
import { DesignSandboxWorkspace } from '../../features/design-sandbox/DesignSandboxWorkspace';

export const metadata = {
  title: 'Kumo CRM • Design Sandbox (Dev-Only)',
  description: 'Песочница и лаборатория дизайна компонентов Kumo CRM',
};

export default function DesignSandboxPage() {
  // Доступ строго в режиме разработки (dev-only)
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <DesignSandboxWorkspace />;
}
