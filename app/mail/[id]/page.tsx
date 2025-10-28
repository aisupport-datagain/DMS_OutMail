'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  FileText,
  MapPin,
  Phone,
  AtSign,
  Check,
  RefreshCw
} from 'lucide-react';

const MAIL_DETAILS_STORAGE_KEY = 'outmail:selected-mail-group';
const MAIL_DETAILS_ENTERPRISES_KEY = `${MAIL_DETAILS_STORAGE_KEY}:enterprises`;
const MAIL_DETAILS_ORGS_KEY = `${MAIL_DETAILS_STORAGE_KEY}:organizations`;
const MAIL_DETAILS_DOCUMENTS_KEY = `${MAIL_DETAILS_STORAGE_KEY}:documents`;

type StructuredAddress = {
  id?: string;
  label?: string;
  streetAddress: string;
  city: string;
  state: string;
  county: string;
  country: string;
  postalCode: string;
  default?: boolean;
};

type ParticipantRecord = {
  enterpriseId: string | null;
  organizationId: string | null;
  organizationName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressId?: string | null;
  address?: StructuredAddress | null;
};

type DocumentRecord = {
  id: string;
  name: string;
  displayName?: string;
  pages?: number;
  size?: string;
  uploadedAt?: string;
  fileName?: string;
  fileUrl?: string;
  referenceKey?: string;
  source?: 'seed' | 'upload';
};

const getDocumentLabel = (document?: DocumentRecord | null) =>
  (document && (document.displayName || document.name)) || '';

type OrganizationRecord = {
  id: string;
  name: string;
  addresses: StructuredAddress[];
};

type EnterpriseRecord = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  senderOrganizations?: string[];
  recipientOrganizations?: string[];
};

type MailGroupRecord = {
  id: string;
  taskId: string;
  name: string;
  recipientName?: string;
  status: string;
  deliveryType: string;
  documents: DocumentRecord[];
  mailOptions: MailOptions;
  sender: ParticipantRecord;
  recipient: ParticipantRecord;
  trackingNumber?: string | null;
  deliveredDate?: string | null;
  exceptionReason?: string;
  senderEnterpriseId?: string | null;
  senderContact?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderAddress?: string;
  organizationId?: string | null;
  address?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

const emptyAddress = (): StructuredAddress => ({
  streetAddress: '',
  city: '',
  state: '',
  county: '',
  country: '',
  postalCode: ''
});

const normalizeStructuredAddress = (
  input?: Partial<StructuredAddress> | null,
  fallback?: Partial<StructuredAddress>
): StructuredAddress => {
  const source = input || fallback || {};
  return {
    id: source.id,
    label: source.label,
    streetAddress: source.streetAddress || '',
    city: source.city || '',
    state: source.state || '',
    county: source.county || '',
    country: source.country || '',
    postalCode: source.postalCode || '',
    default: source.default
  };
};

const formatStructuredAddress = (address?: StructuredAddress | null) => {
  if (!address) return '';
  const segments = [
    address.streetAddress,
    address.city && `${address.city}, ${address.state}`.trim(),
    address.postalCode
  ].filter(Boolean);
  const countrySuffix = address.country ? `${address.country}` : '';
  const countySuffix = address.county ? `${address.county}` : '';
  const base = segments.join(', ');
  return [base, countySuffix, countrySuffix].filter(Boolean).join(' • ');
};

type ParticipantRole = 'sender' | 'recipient';

type MailOptionKey = 'certifiedReceipt' | 'returnEnvelope' | 'deliveryConfirmation' | 'coverLetter';

type MailOptions = Record<MailOptionKey, boolean>;

const defaultMailOptions = (): MailOptions => ({
  certifiedReceipt: true,
  returnEnvelope: false,
  deliveryConfirmation: true,
  coverLetter: false
});

const normalizeMailOptions = (options?: Partial<MailOptions> | null): MailOptions => ({
  ...defaultMailOptions(),
  ...(options || {})
});

const MAIL_OPTION_CONFIG: Array<{ key: MailOptionKey; label: string }> = [
  { key: 'certifiedReceipt', label: 'Include certified mail receipt' },
  { key: 'returnEnvelope', label: 'Add return envelope' },
  { key: 'deliveryConfirmation', label: 'Request delivery confirmation' },
  { key: 'coverLetter', label: 'Include cover letter' }
];

type AddressFieldKey =
  | 'streetAddress'
  | 'city'
  | 'state'
  | 'county'
  | 'country'
  | 'postalCode';

const addressFieldConfig: Array<{ key: AddressFieldKey; label: string; span?: number }> = [
  { key: 'streetAddress', label: 'Street Address', span: 2 },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'county', label: 'County' },
  { key: 'country', label: 'Country' },
  { key: 'postalCode', label: 'ZIP Code' }
];

const cloneParticipant = (participant?: ParticipantRecord | null): ParticipantRecord | null =>
  participant
    ? {
        ...participant,
        address: participant.address ? { ...participant.address } : null
      }
    : null;

const ensureParticipant = (role: ParticipantRole, group: MailGroupRecord): ParticipantRecord => {
  if (role === 'sender') {
    return (
      cloneParticipant(group.sender) || {
        enterpriseId: group.senderEnterpriseId || null,
        organizationId: group.sender?.organizationId || null,
        organizationName: group.sender?.organizationName || group.senderContact || '',
        contactName: group.senderContact || '',
        email: group.senderEmail || '',
        phone: group.senderPhone || '',
        addressId: group.sender?.addressId || null,
        address: group.sender?.address ? { ...group.sender.address } : emptyAddress()
      }
    );
  }

  return (
    cloneParticipant(group.recipient) || {
      enterpriseId: group.senderEnterpriseId || null,
      organizationId: group.recipient?.organizationId || group.organizationId || null,
      organizationName: group.recipient?.organizationName || group.name || '',
      contactName: group.recipientName || group.recipient?.contactName || group.name || '',
      email: group.email || '',
      phone: group.phone || '',
      addressId: group.recipient?.addressId || null,
      address: group.recipient?.address ? { ...group.recipient.address } : emptyAddress()
    }
  );
};

const applyParticipantToGroup = (
  role: ParticipantRole,
  group: MailGroupRecord,
  participant: ParticipantRecord
): MailGroupRecord => {
  if (role === 'sender') {
    return {
      ...group,
      sender: participant,
      senderEnterpriseId: participant.enterpriseId || group.senderEnterpriseId || null,
      senderContact: participant.contactName || '',
      senderEmail: participant.email || '',
      senderPhone: participant.phone || '',
      senderAddress: participant.address ? formatStructuredAddress(participant.address) : ''
    };
  }

  const formattedAddress = participant.address ? formatStructuredAddress(participant.address) : '';
  return {
    ...group,
    recipient: participant,
    recipientName: participant.contactName || participant.organizationName || group.recipientName || '',
    name: participant.organizationName || group.name,
    organizationId: participant.organizationId || group.organizationId || null,
    address: formattedAddress,
    email: participant.email || group.email || '',
    phone: participant.phone || group.phone || ''
  };
};

const MailDetailPage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [form, setForm] = useState<MailGroupRecord | null>(null);
  const [enterprises, setEnterprises] = useState<EnterpriseRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        let storedGroup: MailGroupRecord | null = null;

        if (typeof window !== 'undefined') {
          const rawGroup = window.sessionStorage.getItem(MAIL_DETAILS_STORAGE_KEY);
          if (rawGroup) {
            const parsed = JSON.parse(rawGroup);
            if (parsed?.id === params.id) {
              storedGroup = {
                ...parsed,
                mailOptions: normalizeMailOptions(parsed.mailOptions)
              };
            }
          }
          const storedEnterprises = window.sessionStorage.getItem(MAIL_DETAILS_ENTERPRISES_KEY);
          const storedOrganizations = window.sessionStorage.getItem(MAIL_DETAILS_ORGS_KEY);
          const storedDocuments = window.sessionStorage.getItem(MAIL_DETAILS_DOCUMENTS_KEY);

          if (storedEnterprises) {
            setEnterprises(JSON.parse(storedEnterprises));
          }
          if (storedOrganizations) {
            setOrganizations(JSON.parse(storedOrganizations));
          }
          if (storedDocuments) {
            setDocuments(JSON.parse(storedDocuments));
          }
        }

        if (!storedGroup) {
          const response = await fetch('/api/data');
          if (!response.ok) {
            throw new Error('Failed to load data');
          }
          const payload = await response.json();
          setEnterprises(payload.enterprises || []);
          const orgs = (payload.organizations || []).map((org: any) => ({
            ...org,
            addresses: (org.addresses || []).map((addr: any) => normalizeStructuredAddress(addr))
          }));
          setOrganizations(orgs);
          const uploadedDocs: DocumentRecord[] = (payload.uploadedFiles || []).map((file: any, index: number) => {
            const fileName = file.fileName || file.name;
            const displayName = file.displayName || fileName;
            const fileUrl = fileName ? `/api/pdfs/${encodeURIComponent(fileName)}` : undefined;
            return {
              id: file.id || `UP-${index}`,
              name: displayName,
              displayName,
              pages: file.pages,
              size: file.size,
              fileName,
              referenceKey: fileName || displayName,
              fileUrl,
              source: 'seed'
            };
          });
          const lookupByName = uploadedDocs.reduce((acc, doc) => {
            acc[doc.name] = doc;
            if (doc.fileName) {
              acc[doc.fileName] = doc;
            }
            if (doc.displayName) {
              acc[doc.displayName] = doc;
            }
            if (doc.referenceKey) {
              acc[doc.referenceKey] = doc;
            }
            return acc;
          }, {} as Record<string, DocumentRecord>);

          const target = (payload.recipients || []).find((item: any) => item.id === params.id);
          if (!target) {
            throw new Error('Mail group not found');
          }
          const sender = ensureParticipant('sender', {
            ...target,
            sender: target.sender,
            recipient: target.recipient
          } as MailGroupRecord);
          const recipient = ensureParticipant('recipient', {
            ...target,
            sender,
            recipient: target.recipient
          } as MailGroupRecord);
          const normalizedDocuments: DocumentRecord[] = (target.documents || []).map((doc: any, index: number) => {
            if (!doc) return null;
            if (typeof doc === 'object') {
              const fileName = doc.fileName || doc.referenceKey || doc.name;
              const displayName = doc.displayName || doc.name || fileName;
              const fileUrl =
                doc.fileUrl ||
                (fileName ? `/api/pdfs/${encodeURIComponent(fileName)}` : undefined);
              return {
                id: doc.id || `${target.id || params.id}-DOC-${index}`,
                name: displayName,
                displayName,
                pages: doc.pages || Math.floor(Math.random() * 120) + 30,
                size: doc.size || 'N/A',
                fileName,
                referenceKey: fileName || displayName,
                fileUrl,
                source: doc.source || 'seed'
              } as DocumentRecord;
            }
            const match = lookupByName[doc];
            if (match) {
              return {
                ...match,
                id: `${target.id || params.id}-DOC-${index}`
              };
            }
            const fallbackName = typeof doc === 'string' ? doc : `Document ${index + 1}`;
            return {
              id: `${target.id || params.id}-DOC-${index}`,
              name: fallbackName,
              displayName: fallbackName,
              pages: Math.floor(Math.random() * 120) + 30,
              size: 'Unknown',
              fileName: fallbackName,
              referenceKey: fallbackName
            } as DocumentRecord;
          }).filter(Boolean) as DocumentRecord[];

          setDocuments(normalizedDocuments);

          const normalized: MailGroupRecord = {
            ...target,
            documents: normalizedDocuments,
            sender,
            recipient,
            senderEnterpriseId: sender.enterpriseId || payload.enterprises?.[0]?.id || null,
            senderAddress: sender.address ? formatStructuredAddress(sender.address) : '',
            address: recipient.address ? formatStructuredAddress(recipient.address) : target.address || '',
            name: target.name || target.recipientName || '',
            recipientName: target.recipientName || target.name || '',
            mailOptions: normalizeMailOptions(target.mailOptions)
          };
          storedGroup = normalized;
        } else {
          setDocuments(prev => (prev.length ? prev : storedGroup?.documents || []));
        }

        if (!storedGroup) {
          throw new Error('Mail group could not be loaded');
        }

        setForm({
          ...storedGroup,
          mailOptions: normalizeMailOptions(storedGroup.mailOptions)
        });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Mail details unavailable. Please reopen this mail from the Send Mail workflow.');
        setLoading(false);
      }
    };

    load();
  }, [params.id]);

  const updateForm = (updater: (prev: MailGroupRecord) => MailGroupRecord) => {
    setForm(prev => {
      if (!prev) return prev;
      const base: MailGroupRecord = {
        ...prev,
        sender: cloneParticipant(prev.sender) || ensureParticipant('sender', prev),
        recipient: cloneParticipant(prev.recipient) || ensureParticipant('recipient', prev),
        mailOptions: normalizeMailOptions(prev.mailOptions)
      };
      const next = updater(base);
      return next;
    });
  };

  const handleParticipantFieldChange = (
    role: ParticipantRole,
    field: 'contactName' | 'email' | 'phone',
    value: string
  ) => {
    if (!form) return;
    updateForm(prev => {
      const participant = ensureParticipant(role, prev);
      const updated = { ...participant, [field]: value };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const handleAddressFieldChange = (
    role: ParticipantRole,
    key: keyof StructuredAddress,
    value: string
  ) => {
    if (!form) return;
    updateForm(prev => {
      const participant = ensureParticipant(role, prev);
      const address = participant.address ? { ...participant.address } : emptyAddress();
      const updated = {
        ...participant,
        address: normalizeStructuredAddress({ ...address, [key]: value })
      };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const handleAddressSelect = (role: ParticipantRole, addressId: string) => {
    if (!form) return;
    updateForm(prev => {
      const participant = ensureParticipant(role, prev);
      const organization = organizations.find(org => org.id === participant.organizationId);
      const selected = organization?.addresses.find(addr => addr.id === addressId);
      if (!selected) return prev;
      const updated = {
        ...participant,
        addressId: selected.id,
        address: normalizeStructuredAddress(selected)
      };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const handleMailOptionToggle = (key: MailOptionKey) => {
    updateForm(prev => {
      const currentOptions = normalizeMailOptions(prev.mailOptions);
      return {
        ...prev,
        mailOptions: {
          ...currentOptions,
          [key]: !currentOptions[key]
        }
      };
    });
  };

  const handleSave = () => {
    if (!form) return;
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(MAIL_DETAILS_STORAGE_KEY, JSON.stringify(form));
        window.sessionStorage.setItem(MAIL_DETAILS_ENTERPRISES_KEY, JSON.stringify(enterprises));
        window.sessionStorage.setItem(MAIL_DETAILS_ORGS_KEY, JSON.stringify(organizations));
        window.sessionStorage.setItem(MAIL_DETAILS_DOCUMENTS_KEY, JSON.stringify(documents));
      }
      setSaveMessage('Changes stored for this session.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage('Unable to persist changes.');
    }
  };

  const groupSummary = useMemo(() => {
    if (!form) return { sender: '', recipient: '' };
    return {
      sender: formatStructuredAddress(form.sender?.address) || form.senderAddress || 'Not set',
      recipient: formatStructuredAddress(form.recipient?.address) || form.address || 'Not set'
    };
  }, [form]);

  const mailOptions = useMemo(() => normalizeMailOptions(form?.mailOptions), [form]);
  const primaryDocument = documents[0] || null;
  const additionalDocuments = documents.slice(1);
  const primaryDocumentLabel = getDocumentLabel(primaryDocument);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Loading mail details...
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold text-gray-800">Mail group unavailable</p>
          <p className="text-sm text-gray-500">{error || 'No detail record found for this mail group.'}</p>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  const participantSection = (role: ParticipantRole) => {
    const participant = role === 'sender' ? form.sender : form.recipient;
    const isSender = role === 'sender';
    const organization = participant?.organizationId
      ? organizations.find(org => org.id === participant.organizationId) || null
      : null;
    const addresses = organization?.addresses || [];
    return (
      <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase text-gray-400">
              {isSender ? 'Sender' : 'Recipient'}
            </p>
            <h3 className="text-base font-semibold text-gray-900">
              {participant?.organizationName || organization?.name || 'Not selected'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Building className="w-3 h-3" />
              {organization?.name || '—'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">
              {isSender ? 'Contact Person' : 'Recipient Name'}
            </label>
            <input
              type="text"
              value={participant?.contactName || ''}
              onChange={(event) =>
                handleParticipantFieldChange(role, 'contactName', event.target.value)
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isSender ? 'Contact name' : 'Primary recipient'}
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Organization</label>
            <select
              value={participant?.organizationId || ''}
              onChange={(event) => {
                const orgId = event.target.value;
                const org = organizations.find(o => o.id === orgId) || null;
                updateForm(prev => {
                  const participantRecord = ensureParticipant(role, prev);
                  if (!orgId) {
                    return applyParticipantToGroup(role, prev, {
                      ...participantRecord,
                      organizationId: null,
                      organizationName: '',
                      addressId: null,
                      address: emptyAddress()
                    });
                  }
                  const defaultAddress =
                    org?.addresses.find(addr => addr.default) || org?.addresses[0] || null;
                  const updated = {
                    ...participantRecord,
                    organizationId: org?.id || null,
                    organizationName: org?.name || participantRecord.organizationName || '',
                    addressId: defaultAddress?.id || participantRecord.addressId || null,
                    address: defaultAddress
                      ? normalizeStructuredAddress(defaultAddress)
                      : participantRecord.address || emptyAddress()
                  };
                  return applyParticipantToGroup(role, prev, updated);
                });
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1 flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              Email
            </label>
            <input
              type="email"
              value={participant?.email || ''}
              onChange={(event) => handleParticipantFieldChange(role, 'email', event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              Phone
            </label>
            <input
              type="text"
              value={participant?.phone || ''}
              onChange={(event) => handleParticipantFieldChange(role, 'phone', event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(555) 123-4567"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Saved Address
            </label>
            <select
              value={participant?.addressId || participant?.address?.id || ''}
              onChange={(event) => handleAddressSelect(role, event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose...</option>
              {addresses.map(addr => (
                <option key={addr.id} value={addr.id || addr.streetAddress}>
                  {addr.label || addr.streetAddress || addr.postalCode || 'Address'}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addressFieldConfig.map(field => (
              <div key={`${role}-${field.key}`} className={field.span === 2 ? 'sm:col-span-2' : undefined}>
                <label className="block text-xs uppercase text-gray-400 mb-1">{field.label}</label>
                <input
                  type="text"
                  value={participant?.address?.[field.key] || ''}
                  onChange={(event) => handleAddressFieldChange(role, field.key, event.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={field.label}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to workspace
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{form.name || 'Mail Detail'}</h1>
              <p className="text-xs text-gray-500 mt-1">Mail ID: {form.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Check className="w-4 h-4 mr-1" />
              Save Changes
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <p className="text-xs uppercase text-gray-400 mb-1">Sender Address</p>
                <p className="text-sm text-gray-900">{groupSummary.sender}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                <p className="text-xs uppercase text-gray-400 mb-1">Recipient Address</p>
                <p className="text-sm text-gray-900">{groupSummary.recipient}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {participantSection('sender')}
              {participantSection('recipient')}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-xs uppercase text-gray-400">Document Preview</p>
                <h3 className="text-sm font-semibold text-gray-900 mt-1">
                  {primaryDocumentLabel || 'No document attached'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {documents.length
                    ? `${documents.length} file${documents.length === 1 ? '' : 's'} attached`
                    : 'Upload documents from the workspace wizard.'}
                </p>
              </div>
              <div className="aspect-[8.5/11] bg-gray-100 flex items-center justify-center text-center px-4">
                {primaryDocument ? (
                  <div>
                    <FileText className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-900">
                      {primaryDocumentLabel.length > 40
                        ? `${primaryDocumentLabel.slice(0, 37)}...`
                        : primaryDocumentLabel}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {primaryDocument.pages ? `${primaryDocument.pages} pages` : 'PDF document'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No documents linked to this mail group.</p>
                  </div>
                )}
              </div>
              {additionalDocuments.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <p className="text-xs uppercase text-gray-400 mb-2">Additional Documents</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {additionalDocuments.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span>{getDocumentLabel(doc)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-3">
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
                <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                  {form.status?.replace('-', ' ') || 'pending'}
                </span>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Delivery Type</p>
                <p className="text-sm text-gray-900">{form.deliveryType}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Mail Options</p>
                <div className="space-y-2">
                  {MAIL_OPTION_CONFIG.map(option => (
                    <label key={option.key} className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={mailOptions[option.key]}
                        onChange={() => handleMailOptionToggle(option.key)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Notes</p>
                <textarea
                  rows={3}
                  value={form.notes || ''}
                  onChange={(event) =>
                    updateForm(prev => ({
                      ...prev,
                      notes: event.target.value
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes for this mail group"
                />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default MailDetailPage;
