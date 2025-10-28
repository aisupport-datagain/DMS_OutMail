import MailWorkspace from '../../../components/MailWorkspace';

type TrackMailJobPageProps = {
  params: {
    jobId: string;
  };
};

export default function TrackMailJobPage({ params }: TrackMailJobPageProps) {
  const decodedJobId = decodeURIComponent(params.jobId);
  return <MailWorkspace activeView="tracking" initialJobId={decodedJobId} />;
}
