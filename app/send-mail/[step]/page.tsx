import { redirect } from 'next/navigation';
import MailWorkspace from '../../../components/MailWorkspace';

const VALID_STEPS = new Set(['job-details', 'mail-groups', 'validation', 'approval']);

type SendMailStepPageProps = {
  params: {
    step: string;
  };
};

export default function SendMailStepPage({ params }: SendMailStepPageProps) {
  if (!VALID_STEPS.has(params.step)) {
    redirect('/send-mail/job-details');
  }

  return <MailWorkspace activeView="wizard" />;
}
