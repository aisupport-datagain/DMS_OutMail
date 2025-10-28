'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Package,
  Upload,
  CheckCircle,
  AlertCircle,
  Search,
  Plus,
  FileText,
  MapPin,
  Clock,
  TrendingUp,
  Users,
  Archive,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
  Download,
  Send,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Truck,
  Mail,
  Phone,
  AtSign,
  Hash,
  User,
  ArrowLeftRight,
  CornerUpLeft,
  ExternalLink
} from 'lucide-react';
import {
  getCachedPdf,
  hydratePdfCache,
  removePdfFromCache,
  storePdfInCache
} from '../utils/pdfCache';

const MAIL_STATUS_STYLES: Record<string, string> = {
  valid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  exception: 'bg-red-100 text-red-700',
  'manual-review': 'bg-orange-100 text-orange-700'
};

const MAIL_DETAILS_STORAGE_KEY = 'outmail:selected-mail-group';
const MAIL_DETAILS_ENTERPRISES_KEY = `${MAIL_DETAILS_STORAGE_KEY}:enterprises`;
const MAIL_DETAILS_ORGS_KEY = `${MAIL_DETAILS_STORAGE_KEY}:organizations`;
const MAIL_DETAILS_DOCUMENTS_KEY = `${MAIL_DETAILS_STORAGE_KEY}:documents`;
const MAIL_DETAILS_RETURN_PATH_KEY = `${MAIL_DETAILS_STORAGE_KEY}:return-path`;

const WIZARD_JOB_STORAGE_KEY = 'outmail:wizard:job';
const WIZARD_GROUPS_STORAGE_KEY = 'outmail:wizard:groups';
const TRACK_JOBS_STORAGE_KEY = 'outmail:jobs';

const SEND_MAIL_STEP_PREFIX = '/send-mail';
const WIZARD_STEP_CONFIG = [
  { number: 1, slug: 'job-details', path: `${SEND_MAIL_STEP_PREFIX}/job-details`, name: 'Job Details', icon: FileText },
  { number: 2, slug: 'mail-groups', path: `${SEND_MAIL_STEP_PREFIX}/mail-groups`, name: 'Sender & Recipient Groups', icon: Users },
  { number: 3, slug: 'validation', path: `${SEND_MAIL_STEP_PREFIX}/validation`, name: 'Validate & Preview', icon: Eye },
  { number: 4, slug: 'approval', path: `${SEND_MAIL_STEP_PREFIX}/approval`, name: 'Approval', icon: Check }
] as const;

type WizardStepConfig = (typeof WIZARD_STEP_CONFIG)[number];

type MailView = 'dashboard' | 'wizard' | 'tracking' | 'archive' | 'reports';

const VIEW_ROUTE: Record<MailView, string> = {
  dashboard: '/dashboard',
  wizard: '/send-mail/job-details',
  tracking: '/track-mail',
  archive: '/archive',
  reports: '/reports'
};

type MailWorkspaceProps = {
  activeView: MailView;
};

type MailDetailsDrawerProps = {
  open: boolean;
  group: MailGroupRecord;
  enterprises: EnterpriseRecord[];
  organizations: OrganizationRecord[];
  onClose: () => void;
  onSave: (group: MailGroupRecord) => void;
  onChange: (group: MailGroupRecord) => void;
  onUpload: (files: FileList | File[]) => void;
  onRemoveDocument: (documentId: string) => void;
  onUpdateOrganization: (organizationId: string, updater: (organization: OrganizationRecord) => OrganizationRecord) => void;
  onSwapParticipants: () => void;
};

type SearchableSelectOption = {
  value: string;
  label: string;
  subLabel?: string;
};

type SearchableSelectProps = {
  value?: string | null;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyMessage?: string;
  allowClear?: boolean;
  id?: string;
};

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value = '',
  onChange,
  options,
  placeholder = 'Type to search…',
  emptyMessage = 'No matches found',
  allowClear = true,
  id
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedOption = useMemo(
    () => options.find(option => option.value === (value ?? '')) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return options;
    }
    return options.filter(option => {
      const base = option.label.toLowerCase();
      const sub = option.subLabel?.toLowerCase() || '';
      return base.includes(trimmed) || sub.includes(trimmed);
    });
  }, [options, query]);

  useEffect(() => {
    if (typeof window === 'undefined' || !open) {
      return;
    }

    const handleClickAway = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickAway);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
    };
  }, [open]);

  const handleOptionSelect = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleClear = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      onChange('');
      setQuery('');
      setOpen(false);
      inputRef.current?.focus();
    },
    [onChange]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      setOpen(true);
      if (!query && selectedOption) {
        setQuery(selectedOption.label);
      }
      event.preventDefault();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        if (selectedOption) {
          setQuery(selectedOption.label);
        }
        return;
      }
      const first = filteredOptions[0];
      if (first) {
        handleOptionSelect(first.value);
      } else {
        setOpen(false);
        setQuery('');
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center border border-gray-300 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={open ? query : selectedOption?.label || ''}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery(selectedOption?.label || '');
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        {allowClear && !!(selectedOption?.value || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</li>
            )}
            {filteredOptions.map(option => {
              const isSelected = option.value === selectedOption?.value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleOptionSelect(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.subLabel && (
                      <div className="text-xs text-gray-500 mt-0.5">{option.subLabel}</div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
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

const MAIL_OPTION_CONFIG: Array<{ key: MailOptionKey; label: string; description?: string }> = [
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

const cloneAddress = (address?: StructuredAddress | null): StructuredAddress | null =>
  address ? { ...address } : null;

const cloneParticipant = (participant?: ParticipantRecord | null): ParticipantRecord | null =>
  participant
    ? {
        ...participant,
        address: cloneAddress(participant.address)
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
        address: cloneAddress(group.sender?.address) || emptyAddress()
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
      address: cloneAddress(group.recipient?.address) || emptyAddress()
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

const MailDetailsDrawer: React.FC<MailDetailsDrawerProps> = ({
  open,
  group,
  enterprises,
  organizations,
  onClose,
  onSave,
  onChange,
  onUpload,
  onRemoveDocument,
  onUpdateOrganization,
  onSwapParticipants
}) => {
  const [form, setForm] = useState<MailGroupRecord>({
    ...group,
    mailOptions: normalizeMailOptions(group.mailOptions)
  });

  useEffect(() => {
    setForm({
      ...group,
      mailOptions: normalizeMailOptions(group.mailOptions)
    });
  }, [group]);

  if (!open || !form) {
    return null;
  }

  const updateForm = (updater: (prev: MailGroupRecord) => MailGroupRecord) => {
    setForm(prev => {
      const base: MailGroupRecord = {
        ...prev,
        sender: cloneParticipant(prev.sender),
        recipient: cloneParticipant(prev.recipient)
      };
      const next = updater(base);
      onChange(next);
      return next;
    });
  };

  const mailOptions = useMemo(
    () => normalizeMailOptions(form.mailOptions),
    [form.mailOptions]
  );

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

  const getOrganizationsForEnterprise = (enterpriseId: string | null, role: ParticipantRole) => {
    if (!enterpriseId) return organizations;
    const enterprise = enterprises.find(ent => ent.id === enterpriseId);
    const ids =
      role === 'sender' ? enterprise?.senderOrganizations : enterprise?.recipientOrganizations;
    if (!ids || !ids.length) return organizations;
    return organizations.filter(org => ids.includes(org.id));
  };

  const handleEnterpriseChange = (enterpriseId: string) => {
    const normalized = enterpriseId || null;
    const enterprise = enterprises.find(ent => ent.id === normalized);
    const senderOrgs = getOrganizationsForEnterprise(normalized, 'sender');
    const recipientOrgs = getOrganizationsForEnterprise(normalized, 'recipient');
    const defaultSenderOrg = senderOrgs[0] || null;
    const defaultRecipientOrg = recipientOrgs[0] || defaultSenderOrg || null;
    const defaultSenderAddress =
      defaultSenderOrg?.addresses.find(addr => addr.default) || defaultSenderOrg?.addresses[0] || null;
    const defaultRecipientAddress =
      defaultRecipientOrg?.addresses.find(addr => addr.default) || defaultRecipientOrg?.addresses[0] || null;

    updateForm(prev => {
      const nextSender: ParticipantRecord = {
        ...(ensureParticipant('sender', prev)),
        enterpriseId: normalized,
        organizationId: defaultSenderOrg?.id || null,
        organizationName: defaultSenderOrg?.name || enterprise?.name || '',
        contactName: prev.sender?.contactName || enterprise?.contact || '',
        email: prev.sender?.email || enterprise?.email || '',
        phone: prev.sender?.phone || enterprise?.phone || '',
        addressId: defaultSenderAddress?.id || prev.sender?.addressId || null,
        address: defaultSenderAddress
          ? normalizeStructuredAddress(defaultSenderAddress)
          : cloneAddress(prev.sender?.address) || emptyAddress()
      };

      const nextRecipient: ParticipantRecord = {
        ...(ensureParticipant('recipient', prev)),
        enterpriseId: normalized,
        organizationId: defaultRecipientOrg?.id || null,
        organizationName: defaultRecipientOrg?.name || prev.recipient?.organizationName || '',
        contactName:
          prev.recipient?.contactName ||
          prev.recipientName ||
          defaultRecipientOrg?.name ||
          '',
        addressId: defaultRecipientAddress?.id || prev.recipient?.addressId || null,
        address: defaultRecipientAddress
          ? normalizeStructuredAddress(defaultRecipientAddress)
          : cloneAddress(prev.recipient?.address) || emptyAddress()
      };

      return {
        ...applyParticipantToGroup(
          'recipient',
          applyParticipantToGroup('sender', prev, nextSender),
          nextRecipient
        ),
        senderEnterpriseId: normalized
      };
    });
  };

  const handleParticipantOrganizationChange = (role: ParticipantRole, organizationId: string) => {
    const normalized = organizationId || null;
    const organization = organizations.find(org => org.id === normalized) || null;
    const defaultAddress =
      organization?.addresses.find(addr => addr.default) || organization?.addresses[0] || null;

    updateForm(prev => {
      const participant = ensureParticipant(role, prev);
      const updated: ParticipantRecord = {
        ...participant,
        organizationId: normalized,
        organizationName: organization?.name || participant.organizationName || '',
        addressId: defaultAddress?.id || participant.addressId || null,
        address: defaultAddress
          ? normalizeStructuredAddress(defaultAddress)
          : participant.address || emptyAddress()
      };
      if (role === 'recipient' && !updated.contactName) {
        updated.contactName = organization?.name || participant.contactName || '';
      }
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const handleParticipantFieldChange = (
    role: ParticipantRole,
    field: 'contactName' | 'email' | 'phone',
    value: string
  ) => {
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
    updateForm(prev => {
      const participant = ensureParticipant(role, prev);
      const organization = organizations.find(org => org.id === participant.organizationId);
      const selected = organization?.addresses.find(addr => addr.id === addressId);
      if (!selected) {
        return prev;
      }
      const updated = {
        ...participant,
        addressId: selected.id,
        address: normalizeStructuredAddress(selected)
      };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const persistAddressToOrganization = (role: ParticipantRole) => {
    const participant = role === 'sender' ? form.sender : form.recipient;
    if (!participant?.organizationId || !participant.address) {
      return;
    }
    const organizationId = participant.organizationId;
    const addressId = participant.addressId || participant.address.id || `ADDR-${Date.now()}`;
    const payload = normalizeStructuredAddress({ ...participant.address, id: addressId });
    onUpdateOrganization(organizationId, (organization) => {
      const remaining = organization.addresses.filter(addr => addr.id !== addressId);
      return {
        ...organization,
        addresses: [...remaining, payload]
      };
    });
    updateForm(prev => {
      const participantRecord = ensureParticipant(role, prev);
      const updated = {
        ...participantRecord,
        addressId: payload.id || addressId,
        address: payload
      };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const handleAddAddress = (role: ParticipantRole) => {
    const participant = role === 'sender' ? form.sender : form.recipient;
    if (!participant?.organizationId) {
      alert('Select an organization before adding addresses.');
      return;
    }
    const newId = `ADDR-${Date.now()}`;
    const newAddress = normalizeStructuredAddress({
      id: newId,
      label: 'New Address',
      streetAddress: '',
      city: '',
      state: '',
      county: '',
      country: '',
      postalCode: ''
    });
    onUpdateOrganization(participant.organizationId, (organization) => ({
      ...organization,
      addresses: [...organization.addresses, newAddress]
    }));
    updateForm(prev => {
      const participantRecord = ensureParticipant(role, prev);
      const updated = {
        ...participantRecord,
        addressId: newId,
        address: newAddress
      };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const handleRemoveAddress = (role: ParticipantRole, addressId: string) => {
    const participant = role === 'sender' ? form.sender : form.recipient;
    if (!participant?.organizationId) {
      return;
    }
    onUpdateOrganization(participant.organizationId, (organization) => ({
      ...organization,
      addresses: organization.addresses.filter(addr => addr.id !== addressId)
    }));
    updateForm(prev => {
      const participantRecord = ensureParticipant(role, prev);
      if (
        participantRecord.addressId !== addressId &&
        participantRecord.address?.id !== addressId
      ) {
        return prev;
      }
      const updated = {
        ...participantRecord,
        addressId: null,
        address: emptyAddress()
      };
      return applyParticipantToGroup(role, prev, updated);
    });
  };

  const documents = (form.documents || []).map((doc: any) =>
    typeof doc === 'string' ? { id: doc, name: doc } : doc
  );
  const currentSendMode: 'grouped' | 'individual' =
    form.sendMode === 'individual' ? 'individual' : 'grouped';

  const handleDrawerSendModeChange = (mode: 'grouped' | 'individual') => {
    updateForm(prev => ({
      ...prev,
      sendMode: mode
    }));
  };

  const renderParticipantSection = (role: ParticipantRole) => {
    const participant = role === 'sender' ? form.sender : form.recipient;
    const isSender = role === 'sender';
    const enterpriseId =
      (isSender ? participant?.enterpriseId : form.sender?.enterpriseId) ||
      form.senderEnterpriseId ||
      null;
    const organization = participant?.organizationId
      ? organizations.find(org => org.id === participant.organizationId) || null
      : null;
    const addresses = organization?.addresses || [];
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {isSender ? 'Sender Organization' : 'Recipient Organization'}
          </h3>
          {isSender && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Enterprise</span>
              <select
                value={enterpriseId || ''}
                onChange={(event) => handleEnterpriseChange(event.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select</option>
                {enterprises.map(ent => (
                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Organization</label>
            <select
              value={participant?.organizationId || ''}
              onChange={(event) => handleParticipantOrganizationChange(role, event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select organization</option>
              {getOrganizationsForEnterprise(enterpriseId, role).map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">
              {isSender ? 'Contact Person' : 'Recipient Name'}
            </label>
            <input
              type="text"
              value={participant?.contactName || ''}
              onChange={(event) => handleParticipantFieldChange(role, 'contactName', event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isSender ? 'Contact name' : 'Primary recipient'}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={participant?.email || ''}
              onChange={(event) => handleParticipantFieldChange(role, 'email', event.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-gray-400 mb-1">Phone</label>
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
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase text-gray-400">Link Saved Address</label>
              <select
                value={participant?.addressId || participant?.address?.id || ''}
                onChange={(event) => handleAddressSelect(role, event.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose...</option>
                {addresses.map(addr => (
                  <option key={addr.id} value={addr.id || addr.streetAddress}>
                    {addr.label || addr.streetAddress || addr.postalCode || 'Address'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddAddress(role)}
                className="px-2 py-1 text-xs border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50"
              >
                Add Address
              </button>
              {(participant?.addressId || participant?.address?.id) && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveAddress(role, participant?.addressId || participant?.address?.id || '')
                  }
                  className="px-2 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => persistAddressToOrganization(role)}
                className="px-2 py-1 text-xs border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Save Changes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {addressFieldConfig.map(field => (
              <div
                key={`${role}-${field.key}`}
                className={field.span === 2 ? 'sm:col-span-2' : undefined}
              >
                <label className="block text-xs uppercase text-gray-400 mb-1">
                  {field.label}
                </label>
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
      </section>
    );
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black bg-opacity-30" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-gray-400">Organisation Group</p>
            <h2 className="text-xl font-semibold text-gray-900 mt-1">
              {form.name || form.recipientName || form.recipient?.organizationName || 'New Mail'}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Task ID: {form.taskId || form.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSwapParticipants}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-md text-gray-600 hover:bg-gray-100 flex items-center"
            >
              <CornerUpLeft className="w-4 h-4 mr-1" />
              Switch Roles
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {renderParticipantSection('sender')}
          {renderParticipantSection('recipient')}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Documents ({documents.length})</h3>
              <label className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                Upload
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf"
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      onUpload(event.target.files);
                      event.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500">
            Files added here are stored with this sender & recipient group and appear in the summary card for easy review.
            </p>
            {documents.length ? (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-900">{getDocumentLabel(doc)}</p>
                        <p className="text-xs text-gray-500">
                          {doc.pages ? `${doc.pages} pages` : 'Unknown pages'} • {doc.size || 'Size unknown'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveDocument(doc.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500">
                No documents linked yet. Upload files above or drop them onto the card.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Mail Preview</h3>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
                <div className="aspect-[8.5/11] bg-gray-100 flex items-center justify-center">
                  {documents.length ? (
                    <div className="text-center px-4">
                      <FileText className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-900">
                        {documents[0].name.length > 40
                          ? `${documents[0].name.slice(0, 37)}...`
                          : documents[0].name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {documents[0].pages ? `${documents[0].pages} pages` : 'PDF preview'}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center px-4">
                      <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Upload documents to preview.</p>
                    </div>
                  )}
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <dt className="uppercase tracking-wide text-gray-400">Recipient</dt>
                  <dd className="mt-1 text-gray-900">
                    {form.recipient?.contactName || form.recipient?.organizationName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-gray-400">Sender</dt>
                  <dd className="mt-1 text-gray-900">
                    {form.sender?.organizationName || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-gray-400">Delivery Type</dt>
                  <dd className="mt-1 text-gray-900">
                    {form.deliveryType || 'Certified Mail'}
                  </dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wide text-gray-400">Status</dt>
                  <dd className="mt-1 text-gray-900">
                    {(form.status || 'pending').replace('-', ' ')}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Mail Options</h3>
            <div className="space-y-2">
              {MAIL_OPTION_CONFIG.map(option => (
                <label key={option.key} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={mailOptions[option.key]}
                    onChange={() => handleMailOptionToggle(option.key)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Delivery & Tracking</h3>
            <div>
              <label className="block text-xs uppercase text-gray-400 mb-1">Send Mode</label>
              <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
                <button
                  type="button"
                  onClick={() => handleDrawerSendModeChange('grouped')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    currentSendMode === 'grouped'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Group as one mail
                </button>
                <button
                  type="button"
                  onClick={() => handleDrawerSendModeChange('individual')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    currentSendMode === 'individual'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Send separately
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Use grouped mode to combine all attachments into one envelope, or separate mode to create
                individual mail pieces for each document.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Delivery Type</label>
                <select
                  value={form.deliveryType || 'Certified Mail'}
                  onChange={(event) =>
                    updateForm(prev => ({
                      ...prev,
                      deliveryType: event.target.value
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Certified Mail</option>
                  <option>First Class</option>
                  <option>Priority</option>
                  <option>Express</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Status</label>
                <select
                  value={form.status || 'pending'}
                  onChange={(event) =>
                    updateForm(prev => ({
                      ...prev,
                      status: event.target.value
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="valid">Valid</option>
                  <option value="exception">Exception</option>
                  <option value="manual-review">Manual Review</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={form.trackingNumber || ''}
                  onChange={(event) =>
                    updateForm(prev => ({
                      ...prev,
                      trackingNumber: event.target.value
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tracking code"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes || ''}
                  onChange={(event) =>
                    updateForm(prev => ({
                      ...prev,
                      notes: event.target.value
                    }))
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Internal notes"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-5 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

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
  cacheKey?: string;
};

type JobRecord = {
  id: string;
  name: string;
  status: string;
  sentDate: string | null;
  items: number;
  delivered: number;
  inTransit: number;
  exceptions: number;
  priority: string;
};

type TrackingEventRecord = {
  timestamp: string;
  event: string;
  location: string;
  signature?: string;
};

const isValidJobRecord = (input: unknown): input is JobRecord => {
  if (!input || typeof input !== 'object') return false;
  const value = input as Record<string, unknown>;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.status === 'string'
  );
};

const mergeJobsById = (base: JobRecord[], extras: JobRecord[]) => {
  const map = new Map<string, JobRecord>();
  base.forEach(job => map.set(job.id, job));
  extras.forEach(job => map.set(job.id, job));
  return Array.from(map.values());
};

const sortJobsByDate = (jobs: JobRecord[]) =>
  [...jobs].sort((a, b) => {
    const parseDate = (value?: string | null) => {
      if (!value) {
        return 0;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };
    return parseDate(b.sentDate) - parseDate(a.sentDate);
  });

const calculateDashboardKpis = (jobs: JobRecord[]) => {
  const activeJobs = jobs.filter(job => job.status !== 'delivered').length;
  const itemsInTransit = jobs.reduce((sum, job) => sum + (job.inTransit || 0), 0);
  const exceptions = jobs.reduce((sum, job) => sum + (job.exceptions || 0), 0);
  const today = new Date().toISOString().slice(0, 10);

  const deliveredTodayTotal = jobs.reduce((sum, job) => {
    if (job.sentDate === today && job.delivered) {
      return sum + job.delivered;
    }
    return sum;
  }, 0);

  let recentDelivered = 0;
  if (!deliveredTodayTotal) {
    const deliveredJobs = jobs
      .filter(job => job.status === 'delivered' && job.delivered)
      .sort((a, b) => {
        const parse = (value?: string | null) => {
          if (!value) return 0;
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
        };
        return parse(b.sentDate) - parse(a.sentDate);
      });
    if (deliveredJobs.length > 0) {
      recentDelivered = deliveredJobs[0].delivered || 0;
    }
  }

  return {
    activeJobs,
    itemsInTransit,
    deliveredToday: deliveredTodayTotal || recentDelivered,
    exceptions
  };
};

const loadStoredJobs = (): JobRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(TRACK_JOBS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidJobRecord) as JobRecord[];
  } catch (error) {
    console.warn('Failed to load stored job history', error);
    return [];
  }
};

const persistJobsToStorage = (jobs: JobRecord[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(TRACK_JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch (error) {
    console.warn('Failed to persist job history', error);
  }
};

const formatTimelineTimestamp = (date: Date) => {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
};

const addHours = (date: Date, hours: number) => {
  const clone = new Date(date.getTime());
  clone.setHours(clone.getHours() + hours);
  return clone;
};

const buildTimelineForJob = (sentOn: Date): TrackingEventRecord[] => {
  return [
    {
      timestamp: formatTimelineTimestamp(addHours(sentOn, -4)),
      event: 'Label Created',
      location: 'Outbound Processing Facility'
    },
    {
      timestamp: formatTimelineTimestamp(addHours(sentOn, -2)),
      event: 'Picked Up',
      location: 'Outbound Processing Facility'
    },
    {
      timestamp: formatTimelineTimestamp(sentOn),
      event: 'In Transit',
      location: 'Regional Sorting Center'
    },
    {
      timestamp: formatTimelineTimestamp(addHours(sentOn, 18)),
      event: 'Out for Delivery',
      location: 'Destination Post Office'
    }
  ];
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

type MailGroupRecord = {
  id: string;
  taskId: string;
  name: string;
  recipientName?: string;
  status: string;
  deliveryType: string;
  sendMode?: 'grouped' | 'individual';
  documents: DocumentRecord[];
  mailOptions: MailOptions;
  sender: ParticipantRecord;
  recipient: ParticipantRecord;
  trackingNumber?: string | null;
  deliveredDate?: string | null;
  exceptionReason?: string;
  jobId?: string | null;
  // Legacy fields kept for backwards compatibility during refactor
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

const getDocumentLabel = (document: DocumentRecord) => document.displayName || document.name;

const getDocumentReference = (document: DocumentRecord) =>
  document.referenceKey || document.fileName || document.name;

const serializeDocumentForStorage = (document: DocumentRecord) => {
  const serialized = { ...document };
  if (serialized.cacheKey) {
    if (getCachedPdf(serialized.cacheKey)) {
      serialized.fileUrl = undefined;
    }
  } else if (serialized.fileUrl && serialized.fileUrl.startsWith('blob:')) {
    serialized.fileUrl = undefined;
  }
  return serialized;
};

const reviveDocumentFromStorage = (document: DocumentRecord): DocumentRecord => {
  const revived = { ...document };
  if (revived.cacheKey) {
    const cached = getCachedPdf(revived.cacheKey);
    if (cached) {
      revived.fileUrl = cached;
    }
  } else if (revived.fileUrl?.startsWith('data:')) {
    hydratePdfCache(revived.cacheKey || revived.id, revived.fileUrl);
  }
  return revived;
};

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

const getPrimaryOrganizationAddress = (
  organization?: OrganizationRecord | null
): StructuredAddress | null => {
  if (!organization || !organization.addresses?.length) {
    return null;
  }
  return organization.addresses.find(addr => addr.default) || organization.addresses[0] || null;
};

const describePrimaryAddress = (organization?: OrganizationRecord | null) => {
  const primary = getPrimaryOrganizationAddress(organization);
  return primary ? formatStructuredAddress(primary) : '';
};

const sanitizeIdSegment = (value: string | null | undefined) => {
  const sanitized = (value || 'none').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return sanitized || 'NONE';
};

const buildGroupKey = (senderId: string | null | undefined, recipientId: string | null | undefined) =>
  `${senderId || 'none'}::${recipientId || 'none'}`;

const buildMailGroupId = (senderId: string | null | undefined, recipientId: string | null | undefined) =>
  `MAIL-${sanitizeIdSegment(senderId)}-${sanitizeIdSegment(recipientId)}`;

const buildTaskId = (senderId: string | null | undefined, recipientId: string | null | undefined) =>
  `TASK-${sanitizeIdSegment(senderId)}-${sanitizeIdSegment(recipientId)}`;

const arraysShallowEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
};

type MailGroupCardProps = {
  group: MailGroupRecord;
  enterprises: EnterpriseRecord[];
  organizations: OrganizationRecord[];
  onFileUpload: (files: FileList | File[]) => void;
  onDeliveryChange: (value: string) => void;
  onOpenDetails?: () => void;
  onSwapParticipants: () => void;
  onSendModeChange: (mode: 'grouped' | 'individual') => void;
};

const MailGroupCard: React.FC<MailGroupCardProps> = ({
  group,
  enterprises,
  organizations,
  onFileUpload,
  onDeliveryChange,
  onOpenDetails,
  onSwapParticipants,
  onSendModeChange
}) => {
  const senderEnterprise = enterprises.find(
    ent => ent.id === group.sender?.enterpriseId || group.senderEnterpriseId
  );
  const senderOrganization = organizations.find(
    org => org.id === group.sender?.organizationId || group.organizationId
  );
  const recipientOrganization = organizations.find(
    org => org.id === group.recipient?.organizationId || group.organizationId
  );
  const documents = (group.documents || []).map((doc) =>
    typeof doc === 'string' ? { id: doc, name: doc, displayName: doc } : doc
  );
  const docCount = documents.length;
  const previewDocs = documents.slice(0, 4);
  const remainingDocs = Math.max(documents.length - previewDocs.length, 0);
  const displayName = group.name || group.recipientName || 'Unnamed Mail';
  const sendMode = group.sendMode === 'individual' ? 'individual' : 'grouped';
  const senderAddress =
    formatStructuredAddress(group.sender?.address) ||
    group.senderAddress ||
    describePrimaryAddress(senderOrganization);
  const recipientAddress =
    formatStructuredAddress(group.recipient?.address) ||
    group.address ||
    describePrimaryAddress(recipientOrganization);
  const senderName = senderOrganization?.name || senderEnterprise?.name || 'Select sender';
  const recipientName = recipientOrganization?.name || displayName || 'Select recipient';
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const normalizePdfFiles = (files: FileList | File[] | null | undefined): File[] => {
    if (!files) return [];
    const source = files instanceof FileList ? Array.from(files) : Array.from(files);
    return source.filter(file => {
      const lower = file.name.toLowerCase();
      return file.type === 'application/pdf' || lower.endsWith('.pdf');
    });
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = normalizePdfFiles(event.target.files);
    if (files.length) {
      onFileUpload(files);
    }
    event.target.value = '';
  };

  const handleModeSelection = (mode: 'grouped' | 'individual') => {
    if (mode !== sendMode) {
      onSendModeChange(mode);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const related = event.relatedTarget as Node | null;
    if (related && event.currentTarget.contains(related)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const files = normalizePdfFiles(event.dataTransfer?.files || null);
    if (files.length) {
      onFileUpload(files);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-gray-400">Sender & Recipient</p>
          <h3 className="text-lg font-semibold text-gray-900">
            {senderName}
            <span className="mx-2 text-gray-300">→</span>
            {recipientName}
          </h3>
          {group.taskId ? (
            <p className="text-xs text-gray-500 mt-1">Task ID: {group.taskId}</p>
          ) : (
            <p className="text-xs text-blue-600 mt-1">Attach documents to create a mail task.</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {docCount === 0
              ? 'No documents uploaded yet'
              : `${docCount} document${docCount === 1 ? '' : 's'} attached`}
          </p>
          {senderAddress && (
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-medium text-gray-600">From:</span> {senderAddress}
            </p>
          )}
          {recipientAddress && (
            <p className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">To:</span> {recipientAddress}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={handleZoneClick}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <Upload className="w-4 h-4" />
            Upload PDFs
          </button>
          {onOpenDetails && (
            <button
              onClick={onOpenDetails}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              Mail Details
            </button>
          )}
          <button
            onClick={onSwapParticipants}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-2.5 py-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            title="Swap sender and recipient"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs uppercase text-gray-500">Sender</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{senderName}</p>
          <p className="mt-2 text-xs text-gray-600">
            {senderAddress || 'Primary address not set'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs uppercase text-gray-500">Recipient</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{recipientName}</p>
          <p className="mt-2 text-xs text-gray-600">
            {recipientAddress || 'Primary address not set'}
          </p>
        </div>
      </div>

      <div
        className={`rounded-xl border-2 border-dashed ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
        } p-6 text-center transition-colors cursor-pointer`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        onKeyDown={handleZoneKeyDown}
        role="button"
        tabIndex={0}
      >
        <Upload
          className={`w-8 h-8 mx-auto mb-3 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`}
        />
        <p className="text-sm font-medium text-gray-900">Drag & drop PDF documents</p>
        <p className="text-xs text-gray-600 mt-1">or click to browse files from your computer.</p>
      </div>

      <div>
        <p className="text-xs uppercase text-gray-500">Documents</p>
        {docCount > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {previewDocs.map((doc) => {
              const label = getDocumentLabel(doc);
              return (
                <span
                  key={doc.id}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                >
                  <FileText className="w-3 h-3" />
                  {label.length > 32 ? `${label.slice(0, 29)}…` : label}
                </span>
              );
            })}
            {remainingDocs > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                +{remainingDocs} more
              </span>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-gray-500">
            No documents attached yet. Use the dropzone above to upload supporting PDFs.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase text-gray-500">Send Mode</p>
          <div className="mt-2 inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => handleModeSelection('grouped')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                sendMode === 'grouped'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Group as one mail
            </button>
            <button
              type="button"
              onClick={() => handleModeSelection('individual')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                sendMode === 'individual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Send separately
            </button>
          </div>
          <p className="mt-2 max-w-md text-xs text-gray-500">
            Choose whether to bundle documents into a single envelope or create individual mail pieces
            for each attachment.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div>
            <label className="text-xs uppercase text-gray-500 block mb-1">Delivery Type</label>
            <select
              value={group.deliveryType || 'Certified Mail'}
              onChange={(event) => onDeliveryChange(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Certified Mail</option>
              <option>First Class</option>
              <option>Priority</option>
              <option>Express</option>
            </select>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
};

const MailWorkspace: React.FC<MailWorkspaceProps> = ({ activeView }) => {
  const router = useRouter();
  const steps = WIZARD_STEP_CONFIG;
  const pathname = usePathname();
  const [wizardStep, setWizardStep] = useState(1);

  const currentStep = useMemo<WizardStepConfig>(() => {
    if (activeView !== 'wizard') {
      return steps[0];
    }
    if (!pathname) {
      return steps[0];
    }
    const matched = steps.find(step => pathname.startsWith(step.path));
    return matched || steps[0];
  }, [activeView, pathname, steps]);

  useEffect(() => {
    if (activeView !== 'wizard') {
      return;
    }
    if (currentStep.number !== wizardStep) {
      setWizardStep(currentStep.number);
    }
  }, [activeView, currentStep, wizardStep]);

  const navigateToStep = useCallback(
    (stepNumber: number) => {
      if (activeView !== 'wizard') {
        return;
      }
      const target = steps.find(step => step.number === stepNumber);
      if (!target) {
        return;
      }
      if (pathname !== target.path) {
        router.push(target.path);
      }
    },
    [activeView, pathname, router, steps]
  );

  const navigateTo = (view: MailView) => {
    const target = VIEW_ROUTE[view];
    if (!target) return;
    router.push(target);
  };

  const isActiveView = (view: MailView) => activeView === view;
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [showQuickMail, setShowQuickMail] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<DocumentRecord[]>([]);
  const [addressExceptions, setAddressExceptions] = useState([]);
  const [showFixAddress, setShowFixAddress] = useState(false);
  const [addressToFix, setAddressToFix] = useState(null);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [existingRecipients, setExistingRecipients] = useState([]);
  const [enterprises, setEnterprises] = useState<EnterpriseRecord[]>([]);
  const [mailGroups, setMailGroups] = useState<MailGroupRecord[]>([]);
  const [, setEditingMailGroup] = useState<MailGroupRecord | null>(null);
  const [mailGroupSearch, setMailGroupSearch] = useState('');
  const [mailGroupSearchInput, setMailGroupSearchInput] = useState('');
  const [mailGroupClientFilter, setMailGroupClientFilter] = useState<'all' | string>('all');
  const [mailGroupOrganizationFilter, setMailGroupOrganizationFilter] = useState<'all' | string>('all');
  const [selectedPreviewGroupId, setSelectedPreviewGroupId] = useState<string | null>(null);
  const [selectedPreviewDocumentId, setSelectedPreviewDocumentId] = useState<string | null>(null);
  const mailGroupSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mailTaskGroups = useMemo(
    () => mailGroups.filter(group => !group.jobId && (group.documents?.length || 0) > 0),
    [mailGroups]
  );
  const recipients = mailGroups;
  const setRecipients = setMailGroups;
  const [sampleJobs, setSampleJobs] = useState<JobRecord[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEventRecord[]>([]);
  const [kpis, setKpis] = useState({
    activeJobs: 0,
    itemsInTransit: 0,
    deliveredToday: 0,
    exceptions: 0
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [archiveFilters, setArchiveFilters] = useState({
    query: '',
    status: 'all',
    date: ''
  });
  const [archiveResults, setArchiveResults] = useState<JobRecord[]>([]);
  const [reportModal, setReportModal] = useState(null);

  const enterpriseNamesById = useMemo(() => {
    const lookup: Record<string, string> = {};
    enterprises.forEach(enterprise => {
      lookup[enterprise.id] = enterprise.name;
    });
    return lookup;
  }, [enterprises]);

  const organizationNamesById = useMemo(() => {
    const lookup: Record<string, string> = {};
    organizations.forEach(organization => {
      lookup[organization.id] = organization.name;
    });
    return lookup;
  }, [organizations]);

  const [jobData, setJobData] = useState({
    jobName: '',
    dueDate: '',
    priority: 'standard',
    notes: '',
    senderOrganizationIds: [] as string[],
    recipientOrganizationIds: [] as string[],
    documents: [],
    recipients: []
  });
  const [isWizardHydrated, setIsWizardHydrated] = useState(false);
  const jobNameInputRef = useRef<HTMLInputElement | null>(null);
  const jobNameDraftRef = useRef('');

  useEffect(() => {
    jobNameDraftRef.current = jobData.jobName;
    const input = jobNameInputRef.current;
    if (input && input.value !== jobData.jobName) {
      input.value = jobData.jobName;
    }
  }, [jobData.jobName]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsWizardHydrated(true);
      return;
    }
    try {
      const storedJob = window.sessionStorage.getItem(WIZARD_JOB_STORAGE_KEY);
      if (storedJob) {
        const parsed = JSON.parse(storedJob);
        setJobData(prev => {
          const senderArray = Array.isArray(parsed.senderOrganizationIds)
            ? parsed.senderOrganizationIds
            : parsed.senderOrganizationId
            ? [parsed.senderOrganizationId]
            : prev.senderOrganizationIds;
          const recipientArray = Array.isArray(parsed.recipientOrganizationIds)
            ? parsed.recipientOrganizationIds
            : parsed.recipientOrganizationId
            ? [parsed.recipientOrganizationId]
            : prev.recipientOrganizationIds;
          return {
            ...prev,
            ...parsed,
            senderOrganizationIds: Array.from(new Set(senderArray)).filter(Boolean),
            recipientOrganizationIds: Array.from(new Set(recipientArray)).filter(Boolean)
          };
        });
      }
      const storedGroups = window.sessionStorage.getItem(WIZARD_GROUPS_STORAGE_KEY);
      if (storedGroups) {
        const parsed = JSON.parse(storedGroups);
        if (Array.isArray(parsed)) {
          const normalized = (parsed as MailGroupRecord[]).map(group => {
            const docs = group.documents || [];
            const senderOrgId = group.sender?.organizationId || null;
            const recipientOrgId = group.recipient?.organizationId || group.organizationId || null;
            return {
              ...group,
              documents: docs.map(doc => reviveDocumentFromStorage(doc as DocumentRecord)),
              taskId: docs.length > 0 ? group.taskId || buildTaskId(senderOrgId, recipientOrgId) : ''
            };
          });
          setMailGroups(normalized);
        }
      }
    } catch (error) {
      console.warn('Failed to restore wizard draft state', error);
    } finally {
      setIsWizardHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isWizardHydrated || typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.setItem(WIZARD_JOB_STORAGE_KEY, JSON.stringify(jobData));
    } catch (error) {
      console.warn('Failed to persist wizard job data', error);
    }
  }, [isWizardHydrated, jobData]);

  useEffect(() => {
    if (!isWizardHydrated || typeof window === 'undefined') {
      return;
    }
    try {
      const persistable = mailGroups.map(group => ({
        ...group,
        documents: (group.documents || []).map(doc => serializeDocumentForStorage(doc as DocumentRecord))
      }));
      window.sessionStorage.setItem(WIZARD_GROUPS_STORAGE_KEY, JSON.stringify(persistable));
    } catch (error) {
      console.warn('Failed to persist wizard mail groups', error);
    }
  }, [isWizardHydrated, mailGroups]);

  useEffect(() => {
    if (isLoadingData) {
      return;
    }
    persistJobsToStorage(sampleJobs);
  }, [isLoadingData, sampleJobs]);

  useEffect(() => {
    setKpis(calculateDashboardKpis(sampleJobs));
  }, [sampleJobs]);

  const recipientStats = useMemo(() => {
    const total = mailTaskGroups.length;
    const exceptionsCount = addressExceptions.length;
    const validCount = Math.max(total - exceptionsCount, 0);
    const correctedCount = Math.min(Math.max(Math.round(total * 0.1), 0), validCount);
    return {
      total,
      validCount,
      correctedCount,
      exceptionsCount
    };
  }, [mailTaskGroups, addressExceptions]);

  const selectedSenderOrganizations = useMemo(
    () =>
      jobData.senderOrganizationIds
        .map(id => organizations.find(org => org.id === id))
        .filter((org): org is OrganizationRecord => Boolean(org)),
    [jobData.senderOrganizationIds, organizations]
  );

  const selectedRecipientOrganizations = useMemo(
    () =>
      jobData.recipientOrganizationIds
        .map(id => organizations.find(org => org.id === id))
        .filter((org): org is OrganizationRecord => Boolean(org)),
    [jobData.recipientOrganizationIds, organizations]
  );

  const formatSelectionSummary = (items: { name: string }[]) => {
    if (!items.length) return 'Not selected';
    if (items.length === 1) return items[0].name;
    return `${items[0].name} (+${items.length - 1} more)`;
  };

  const senderSummary = formatSelectionSummary(selectedSenderOrganizations);
  const recipientSummary = formatSelectionSummary(selectedRecipientOrganizations);

  const organizationOptions = useMemo<SearchableSelectOption[]>(
    () =>
      organizations.map(org => ({
        value: org.id,
        label: org.name,
        subLabel: describePrimaryAddress(org) || 'No primary address on file'
      })),
    [organizations]
  );

  const findEnterpriseForOrganizations = (
    senderOrgId: string | null,
    recipientOrgId: string | null
  ): EnterpriseRecord | null => {
    if (!enterprises.length) {
      return null;
    }
    const normalizedSender = senderOrgId || null;
    const normalizedRecipient = recipientOrgId || null;

    const matchBoth = enterprises.find(ent => {
      const senderMatch = normalizedSender
        ? ent.senderOrganizations?.includes(normalizedSender)
        : true;
      const recipientMatch = normalizedRecipient
        ? ent.recipientOrganizations?.includes(normalizedRecipient)
        : true;
      return senderMatch && recipientMatch;
    });
    if (matchBoth) {
      return matchBoth;
    }

    if (normalizedSender) {
      const senderOnly = enterprises.find(ent =>
        ent.senderOrganizations?.includes(normalizedSender)
      );
      if (senderOnly) {
        return senderOnly;
      }
    }

    if (normalizedRecipient) {
      const recipientOnly = enterprises.find(ent =>
        ent.recipientOrganizations?.includes(normalizedRecipient)
      );
      if (recipientOnly) {
        return recipientOnly;
      }
    }

    return enterprises[0] || null;
  };

  const deliveryMix = useMemo(() => {
    if (!mailTaskGroups.length) {
      return 'Not defined';
    }
    const unique = Array.from(new Set(mailTaskGroups.map(r => r.deliveryType || 'Certified Mail')));
    return unique.join(', ');
  }, [mailTaskGroups]);

  const totalDocumentsAcrossMails = useMemo(
    () => mailTaskGroups.reduce((sum, group) => sum + (group.documents?.length || 0), 0),
    [mailTaskGroups]
  );

  const estimatedCost = useMemo(() => {
    if (!mailTaskGroups.length) return '0.00';
    return (mailTaskGroups.length * 7.95).toFixed(2);
  }, [mailTaskGroups]);

  const selectedPreviewGroup = useMemo(() => {
    if (!selectedPreviewGroupId) {
      return null;
    }
    return mailTaskGroups.find(group => group.id === selectedPreviewGroupId) || null;
  }, [mailTaskGroups, selectedPreviewGroupId]);

  useEffect(() => {
    if (!selectedPreviewGroup) {
      setSelectedPreviewDocumentId(null);
      return;
    }
    const docs = selectedPreviewGroup.documents || [];
    if (!docs.length) {
      setSelectedPreviewDocumentId(null);
      return;
    }
    setSelectedPreviewDocumentId(prev =>
      docs.some(doc => doc.id === prev) ? prev : docs[0].id
    );
  }, [selectedPreviewGroup]);

  const selectedPreviewDocument = useMemo(() => {
    if (!selectedPreviewGroup) {
      return null;
    }
    const docs = selectedPreviewGroup.documents || [];
    if (!docs.length) {
      return null;
    }
    return docs.find(doc => doc.id === selectedPreviewDocumentId) || docs[0] || null;
  }, [selectedPreviewGroup, selectedPreviewDocumentId]);

  const selectedMailOptions = useMemo(
    () => normalizeMailOptions(selectedPreviewGroup?.mailOptions),
    [selectedPreviewGroup?.mailOptions]
  );

  const previewDocuments = selectedPreviewGroup?.documents || [];
  const previewRecipientAddress = selectedPreviewGroup?.recipient?.address
    ? formatStructuredAddress(selectedPreviewGroup.recipient.address)
    : selectedPreviewGroup?.address || 'No address provided';
  const previewSenderAddress = selectedPreviewGroup?.sender?.address
    ? formatStructuredAddress(selectedPreviewGroup.sender.address)
    : selectedPreviewGroup?.senderAddress || 'No sender address on file';

  const reportSummaries = useMemo(() => {
    const totalMailSent = sampleJobs.reduce((sum, job) => sum + (job.items || 0), 0);
    const deliveredItems = sampleJobs.reduce((sum, job) => sum + (job.delivered || 0), 0);
    const deliveryRate = totalMailSent ? ((deliveredItems / totalMailSent) * 100).toFixed(1) : '0.0';
    const exceptionsTotal = sampleJobs.reduce((sum, job) => sum + (job.exceptions || 0), 0);
    const averageDeliveryTime = (3 + Math.min(exceptionsTotal / Math.max(totalMailSent || 1, 1), 2)).toFixed(1);
    const estimatedSpend = (totalMailSent * 7.95).toFixed(2);
    return {
      totalMailSent,
      deliveredItems,
      deliveryRate,
      averageDeliveryTime,
      estimatedSpend
    };
  }, [sampleJobs]);

  useEffect(() => {
    if (activeView === 'tracking' && !selectedJob && sampleJobs.length > 0) {
      setSelectedJob(sampleJobs[0]);
    }
  }, [activeView, selectedJob, sampleJobs]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const payload = await response.json();
        const enterprisesData: EnterpriseRecord[] = (payload.enterprises || []).map((entry: any) => ({
          id: entry.id,
          name: entry.name,
          contact: entry.contact,
          email: entry.email,
          phone: entry.phone,
          senderOrganizations: entry.senderOrganizations || [],
          recipientOrganizations: entry.recipientOrganizations || []
        }));
        const organizationsData: OrganizationRecord[] = (payload.organizations || []).map((org: any) => ({
          ...org,
          addresses: (org.addresses || []).map((addr: any) => normalizeStructuredAddress(addr))
        }));
        const uploaded: DocumentRecord[] = (payload.uploadedFiles || []).map((file: any, index: number) => {
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
        const uploadedLookup = new Map<string, DocumentRecord>();
        uploaded.forEach(file => {
          const keys = [file.id, file.fileName, file.name, file.displayName, file.referenceKey].filter(Boolean);
          keys.forEach(key => {
            uploadedLookup.set(String(key), file);
          });
        });
        const buildParticipantFromSeed = (
          participant: any,
          fallback: Partial<ParticipantRecord> = {}
        ): ParticipantRecord => {
          const rawAddress = participant?.address || fallback.address || null;
          return {
            enterpriseId: participant?.enterpriseId ?? fallback.enterpriseId ?? null,
            organizationId: participant?.organizationId ?? fallback.organizationId ?? null,
            organizationName: participant?.organizationName ?? fallback.organizationName ?? '',
            contactName: participant?.contactName ?? fallback.contactName ?? '',
            email: participant?.email ?? fallback.email ?? '',
            phone: participant?.phone ?? fallback.phone ?? '',
            addressId: participant?.addressId ?? participant?.address?.id ?? fallback.addressId ?? null,
            address: rawAddress ? normalizeStructuredAddress(rawAddress) : null
          };
        };
        const recipientRecords: MailGroupRecord[] = (payload.recipients || []).map((entry: any, index: number) => {
          const groupId = entry.id || `REC-${index}`;
          const createDocumentFromSeed = (doc: any, docIndex: number): DocumentRecord | null => {
            if (!doc) {
              return null;
            }
            const baseId = doc.id || `${groupId}-DOC-${docIndex}`;
            if (typeof doc === 'string') {
              const matched = uploadedLookup.get(doc);
              if (matched) {
                return reviveDocumentFromStorage({
                  ...matched,
                  id: baseId,
                  source: 'seed'
                });
              }
              return reviveDocumentFromStorage({
                id: baseId,
                name: doc,
                displayName: doc,
                fileName: doc,
                referenceKey: doc,
                source: 'seed'
              } as DocumentRecord);
            }
            const referenceKey = doc.referenceKey || doc.fileName || doc.name;
            const matched = referenceKey ? uploadedLookup.get(referenceKey) : undefined;
            const fileName = doc.fileName || matched?.fileName || referenceKey;
            const displayName =
              doc.displayName ||
              doc.name ||
              matched?.displayName ||
              fileName ||
              `Document ${docIndex + 1}`;
            const fileUrl =
              doc.fileUrl ||
              (fileName ? `/api/pdfs/${encodeURIComponent(fileName)}` : matched?.fileUrl);
            return reviveDocumentFromStorage({
              id: baseId,
              name: displayName,
              displayName,
              pages: doc.pages || matched?.pages,
              size: doc.size || matched?.size,
              fileName,
              referenceKey: referenceKey || displayName,
              fileUrl,
              source: 'seed',
              cacheKey: doc.cacheKey
            } as DocumentRecord);
          };

          const senderDefaults: Partial<ParticipantRecord> = {
            enterpriseId: entry.senderEnterpriseId || null,
            organizationId: entry.senderOrganizationId || null,
            organizationName: entry.senderName || '',
            contactName: entry.senderContact || '',
            email: entry.senderEmail || '',
            phone: entry.senderPhone || '',
            addressId: entry.senderAddress?.id || entry.senderAddressId || null,
            address: entry.senderAddress ? normalizeStructuredAddress(entry.senderAddress) : null
          };
          const recipientDefaults: Partial<ParticipantRecord> = {
            enterpriseId: entry.recipientEnterpriseId || null,
            organizationId: entry.recipientOrganizationId || entry.organizationId || null,
            organizationName: entry.recipientOrganizationName || entry.recipientName || entry.name || '',
            contactName: entry.recipientContact || entry.recipientName || entry.name || '',
            email: entry.email || '',
            phone: entry.phone || '',
            addressId: entry.recipientAddress?.id || entry.recipientAddressId || null,
            address: entry.recipientAddress ? normalizeStructuredAddress(entry.recipientAddress) : null
          };

          const senderParticipant = buildParticipantFromSeed(entry.sender, senderDefaults);
          const recipientParticipant = buildParticipantFromSeed(entry.recipient, recipientDefaults);

          const documents = (entry.documents || [])
            .map((doc: any, docIndex: number) => createDocumentFromSeed(doc, docIndex))
            .filter(Boolean) as DocumentRecord[];

          return {
            id: groupId,
            taskId: entry.taskId || '',
            name: entry.name || entry.recipientName || '',
            recipientName: entry.recipientName || entry.name || '',
            status: entry.status || 'in-transit',
            deliveryType: entry.deliveryType || 'Certified Mail',
            documents,
            mailOptions: normalizeMailOptions(entry.mailOptions),
            sender: senderParticipant,
            recipient: recipientParticipant,
            trackingNumber: entry.trackingNumber || null,
            deliveredDate: entry.deliveredDate || null,
            exceptionReason: entry.exceptionReason,
            jobId: entry.jobId || null,
            senderEnterpriseId: entry.senderEnterpriseId || senderParticipant.enterpriseId || null,
            senderContact: entry.senderContact || senderParticipant.contactName || '',
            senderEmail: entry.senderEmail || senderParticipant.email || '',
            senderPhone: entry.senderPhone || senderParticipant.phone || '',
            senderAddress:
              entry.senderAddress ||
              (senderParticipant.address ? formatStructuredAddress(senderParticipant.address) : ''),
            organizationId: entry.organizationId || recipientParticipant.organizationId || null,
            address:
              entry.address ||
              (recipientParticipant.address ? formatStructuredAddress(recipientParticipant.address) : ''),
            email: entry.email || recipientParticipant.email || '',
            phone: entry.phone || recipientParticipant.phone || '',
            notes: entry.notes || '',
            sendMode: entry.sendMode || 'grouped'
          };
        });

        setEnterprises(enterprisesData);
        setOrganizations(organizationsData);
        setExistingRecipients(payload.existingRecipients || []);
        setUploadedFiles(uploaded);
        if (recipientRecords.length) {
          setMailGroups(prev => {
            if (!prev.length) {
              return recipientRecords;
            }
            const existingIds = new Set(prev.map(group => group.id));
            const additions = recipientRecords.filter(group => !existingIds.has(group.id));
            if (!additions.length) {
              return prev;
            }
            return [...prev, ...additions];
          });
        }
        const seedJobs: JobRecord[] = payload.jobs || [];
        const storedJobs = loadStoredJobs();
        const mergedJobs = mergeJobsById(seedJobs, storedJobs);
        const sortedJobs = sortJobsByDate(mergedJobs);
        setSampleJobs(sortedJobs);
        setTrackingEvents(payload.trackingEvents || []);
        setArchiveResults(sortedJobs);
        setDataError(null);
      } catch (error) {
        console.error('Failed to load data', error);
        setDataError('Failed to load seed data. Please check data/db.json');
        setEnterprises([]);
        setOrganizations([]);
        setExistingRecipients([]);
        setUploadedFiles([]);
        setMailGroups([]);
        setSampleJobs([]);
        setTrackingEvents([]);
        setArchiveResults([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const activeDraftGroups = mailGroups.filter(group => !group.jobId);
    const allDocs = activeDraftGroups.flatMap(group =>
      (group.documents || [])
        .map(doc => getDocumentReference(doc))
        .filter((ref): ref is string => Boolean(ref))
    );
    const uniqueDocs = Array.from(new Set(allDocs));
    setJobData(prev => ({
      ...prev,
      documents: uniqueDocs,
      recipients: activeDraftGroups
    }));
  }, [mailGroups]);

  useEffect(() => {
    if (!mailTaskGroups.length) {
      setSelectedPreviewGroupId(null);
      return;
    }
    setSelectedPreviewGroupId(prev => {
      if (prev && mailTaskGroups.some(group => group.id === prev)) {
        return prev;
      }
      return mailTaskGroups[0].id;
    });
  }, [mailTaskGroups]);

  useEffect(() => {
    if (isLoadingData) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const rawGroup = window.sessionStorage.getItem(MAIL_DETAILS_STORAGE_KEY);
      if (rawGroup) {
        const parsed = JSON.parse(rawGroup);
        if (parsed?.id) {
          setMailGroups(prev =>
            prev.map(group => (group.id === parsed.id ? parsed : group))
          );
        }
      }
      const rawEnterprises = window.sessionStorage.getItem(MAIL_DETAILS_ENTERPRISES_KEY);
      if (rawEnterprises) {
        setEnterprises(JSON.parse(rawEnterprises));
      }
      const rawOrgs = window.sessionStorage.getItem(MAIL_DETAILS_ORGS_KEY);
      if (rawOrgs) {
        setOrganizations(JSON.parse(rawOrgs));
      }
    } catch (storageError) {
      console.warn('Failed to hydrate mail data from detail page storage', storageError);
    }
  }, [isLoadingData]);

  useEffect(() => {
    if (mailGroupSearchInput === mailGroupSearch) {
      return;
    }
    const handle = window.setTimeout(() => {
      setMailGroupSearch(mailGroupSearchInput);
    }, 250);
    return () => {
      window.clearTimeout(handle);
    };
  }, [mailGroupSearchInput, mailGroupSearch]);

  useEffect(() => {
    const input = mailGroupSearchInputRef.current;
    if (!input) {
      return;
    }
    if (document.activeElement !== input && mailGroupSearchInput.trim().length > 0) {
      input.focus();
      const position = input.value.length;
      input.setSelectionRange(position, position);
    }
  }, [mailGroupSearchInput]);

  const filteredMailGroups = useMemo(() => {
    const query = mailGroupSearch.trim().toLowerCase();
    const hasQuery = query.length > 0;

    return mailGroups.filter(group => {
      if (group.jobId) {
        return false;
      }
      const senderEnterpriseId = group.sender?.enterpriseId || group.senderEnterpriseId || null;
      const recipientEnterpriseId = group.recipient?.enterpriseId || null;
      const candidateStrings: string[] = [
        group.id,
        group.taskId,
        group.name,
        group.recipientName,
        group.sender?.organizationName,
        group.sender?.contactName,
        group.recipient?.organizationName,
        group.recipient?.contactName,
        group.senderAddress,
        group.address,
        formatStructuredAddress(group.sender?.address),
        formatStructuredAddress(group.recipient?.address),
        senderEnterpriseId ? enterpriseNamesById[senderEnterpriseId] : '',
        recipientEnterpriseId ? enterpriseNamesById[recipientEnterpriseId] : '',
        group.sender?.organizationId ? organizationNamesById[group.sender.organizationId] : '',
        group.recipient?.organizationId ? organizationNamesById[group.recipient.organizationId] : '',
        group.organizationId ? organizationNamesById[group.organizationId] : '',
        group.email,
        group.phone,
        group.senderEmail,
        group.senderPhone
      ];

      const documentStrings = (group.documents || []).map((document) => {
        if (typeof document === 'string') {
          return document;
        }
        return document.displayName || document.name || document.fileName || '';
      });

      candidateStrings.push(...documentStrings);

      const matchesSearch = hasQuery
        ? candidateStrings.some(value => value && value.toLowerCase().includes(query))
        : true;

      const relatedEnterpriseIds = [
        senderEnterpriseId,
        recipientEnterpriseId
      ].filter(Boolean) as string[];

      const matchesClient =
        mailGroupClientFilter === 'all' ||
        relatedEnterpriseIds.some(id => id === mailGroupClientFilter);

      const relatedOrganizationIds = [
        group.sender?.organizationId,
        group.recipient?.organizationId,
        group.organizationId
      ].filter(Boolean) as string[];

      const matchesOrganization =
        mailGroupOrganizationFilter === 'all' ||
        relatedOrganizationIds.some(id => id === mailGroupOrganizationFilter);

      return matchesSearch && matchesClient && matchesOrganization;
    });
  }, [
    enterpriseNamesById,
    mailGroupClientFilter,
    mailGroupOrganizationFilter,
    mailGroupSearch,
    mailGroups,
    organizationNamesById
  ]);

  const isFilteringMailGroups =
    mailGroupSearchInput.trim().length > 0 ||
    mailGroupClientFilter !== 'all' ||
    mailGroupOrganizationFilter !== 'all';

  const totalMailGroupCount = mailGroups.filter(group => !group.jobId).length;
  const displayedMailGroupCount = filteredMailGroups.length;

  const clearMailGroupFilters = () => {
    setMailGroupSearchInput('');
    setMailGroupSearch('');
    setMailGroupClientFilter('all');
    setMailGroupOrganizationFilter('all');
  };

  // Handler functions
  const generateMailGroupId = () => {
    const existingIds = new Set(mailGroups.map(group => group.id));
    let counter = mailGroups.length + 1;
    let candidate = `MAIL-${String(counter).padStart(3, '0')}`;
    while (existingIds.has(candidate)) {
      counter += 1;
      candidate = `MAIL-${String(counter).padStart(3, '0')}`;
    }
    return candidate;
  };

  const generateTaskId = () => {
    const existingTasks = new Set(mailGroups.map(group => group.taskId));
    let counter = mailGroups.length + 1;
    let candidate = `TASK-${String(counter).padStart(3, '0')}`;
    while (existingTasks.has(candidate)) {
      counter += 1;
      candidate = `TASK-${String(counter).padStart(3, '0')}`;
    }
    return candidate;
  };

  const mutateMailGroup = (groupId: string, updater: (group: MailGroupRecord) => MailGroupRecord) => {
    setMailGroups(prev =>
      prev.map(group => {
        if (group.id !== groupId) return group;
        return updater({
          ...group,
          mailOptions: {
            ...normalizeMailOptions(group.mailOptions)
          }
        });
      })
    );
    setEditingMailGroup(current => {
      if (!current || current.id !== groupId) {
        return current;
      }
      return updater({
        ...current,
        mailOptions: {
          ...normalizeMailOptions(current.mailOptions)
        }
      });
    });
  };

  const createMailGroupDraft = useCallback(
    (senderOrgId: string, recipientOrgId: string): MailGroupRecord => {
      const senderOrg = organizations.find(org => org.id === senderOrgId) || null;
      const recipientOrg = organizations.find(org => org.id === recipientOrgId) || null;
      const resolvedEnterprise = findEnterpriseForOrganizations(senderOrg?.id || null, recipientOrg?.id || null);
      const defaultEnterpriseId = resolvedEnterprise?.id || null;
      const selectDefaultAddress = (org: OrganizationRecord | null) =>
        org?.addresses.find(addr => addr.default) || org?.addresses[0] || null;
      const senderAddress = selectDefaultAddress(senderOrg);
      const recipientAddress = selectDefaultAddress(recipientOrg);
      const id = buildMailGroupId(senderOrgId, recipientOrgId);

      return {
        id,
        taskId: '',
        name: recipientOrg?.name || resolvedEnterprise?.name || '',
        recipientName: recipientOrg?.name || resolvedEnterprise?.name || '',
        address: recipientAddress ? formatStructuredAddress(recipientAddress) : '',
        email: '',
        phone: '',
        senderEnterpriseId: defaultEnterpriseId,
        senderContact: resolvedEnterprise?.contact || '',
        senderEmail: resolvedEnterprise?.email || '',
        senderPhone: resolvedEnterprise?.phone || '',
        senderAddress: senderAddress ? formatStructuredAddress(senderAddress) : '',
        documents: [],
        mailOptions: defaultMailOptions(),
        deliveryType: 'Certified Mail',
        sendMode: 'grouped',
        status: 'pending',
        trackingNumber: null,
        deliveredDate: null,
        jobId: null,
        sender: {
          enterpriseId: defaultEnterpriseId,
          organizationId: senderOrg?.id || null,
          organizationName: senderOrg?.name || resolvedEnterprise?.name || '',
          contactName: resolvedEnterprise?.contact || senderOrg?.name || '',
          email: resolvedEnterprise?.email || '',
          phone: resolvedEnterprise?.phone || '',
          addressId: senderAddress?.id || null,
          address: senderAddress ? normalizeStructuredAddress(senderAddress) : null
        },
        recipient: {
          enterpriseId: defaultEnterpriseId,
          organizationId: recipientOrg?.id || null,
          organizationName: recipientOrg?.name || '',
          contactName: recipientOrg?.name || '',
          email: '',
          phone: '',
          addressId: recipientAddress?.id || null,
          address: recipientAddress ? normalizeStructuredAddress(recipientAddress) : null
        }
      };
    },
    [organizations, enterprises]
  );

  const buildDocumentFromFile = async (file: File, index: number): Promise<DocumentRecord> => {
    const baseId = `${file.name}-${Date.now()}-${index}`;
    const cacheKey = `${baseId}-${file.lastModified}`;
    let fileUrl: string | undefined;

    if (typeof window !== 'undefined') {
      try {
        fileUrl = await storePdfInCache(cacheKey, file);
      } catch (error) {
        console.warn('Failed to cache uploaded PDF, falling back to object URL', error);
        fileUrl = URL.createObjectURL(file);
      }
    }

    return {
      id: baseId,
      name: file.name,
      displayName: file.name,
      pages: Math.floor(Math.random() * 200) + 50,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      fileName: file.name,
      fileUrl,
      referenceKey: file.name,
      source: 'upload',
      cacheKey
    };
  };

  const handleGroupFileUpload = async (groupId, files?: FileList | File[]) => {
    if (!files || files.length === 0) {
      return;
    }
    try {
      const fileArray = Array.from(files instanceof FileList ? files : files);
      const newDocs = await Promise.all(
        fileArray.map((file, index) => buildDocumentFromFile(file, index))
      );
      mutateMailGroup(groupId, (group) => {
        const existingDocs = group.documents || [];
        const nextDocuments = [...existingDocs, ...newDocs];
        const senderOrgId = group.sender?.organizationId || null;
        const recipientOrgId = group.recipient?.organizationId || group.organizationId || null;
        const nextTaskId =
          nextDocuments.length > 0
            ? group.taskId || buildTaskId(senderOrgId, recipientOrgId)
            : '';
        return {
          ...group,
          taskId: nextTaskId,
          documents: nextDocuments
        };
      });
      setUploadedFiles(prev => {
        const existingRefs = new Set(
          prev.map(file => file.referenceKey || file.fileName || file.name)
        );
        const additions = newDocs.filter(doc => {
          const ref = doc.referenceKey || doc.fileName || doc.name;
          return ref ? !existingRefs.has(ref) : true;
        });
        if (!additions.length) {
          return prev;
        }
        return [...prev, ...additions];
      });
    } catch (error) {
      console.error('Failed to process uploaded PDF files', error);
    }
  };

  const finalizeAndDispatchJob = () => {
    if (mailTaskGroups.length === 0) {
      alert('No mail tasks ready to dispatch. Add documents before completing the job.');
      return;
    }
    const now = new Date();
    const uniqueSuffix = now.getTime().toString(36).toUpperCase();
    const nameSegment = (jobData.jobName || 'JOB')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase() || 'JOB';
    const jobId = `JOB-${nameSegment}-${uniqueSuffix}`;

    const dispatchedGroups = mailGroups.map((group, index) => {
      if (!group.documents || group.documents.length === 0) {
        return group;
      }
      const trackingNumber =
        group.trackingNumber || `TRK-${uniqueSuffix}-${String(index + 1).padStart(4, '0')}`;
      return {
        ...group,
        status: 'in-transit',
        trackingNumber,
        deliveredDate: null,
        jobId
      };
    });

    setMailGroups(dispatchedGroups);

    const formattedSentDate = now.toISOString().slice(0, 10);
    const newJob: JobRecord = {
      id: jobId,
      name: jobData.jobName || `Mail Job ${formattedSentDate}`,
      status: 'in-transit',
      sentDate: formattedSentDate,
      items: mailTaskGroups.length,
      delivered: 0,
      inTransit: mailTaskGroups.length,
      exceptions: addressExceptions.length,
      priority: jobData.priority
    };

    const mergedJobs = mergeJobsById(sampleJobs, [newJob]);
    const nextJobs = sortJobsByDate(mergedJobs);
    setSampleJobs(nextJobs);
    setArchiveResults(nextJobs);
    setTrackingEvents(buildTimelineForJob(now));
    setSelectedJob(newJob);

    alert('Mail job dispatched successfully!');
    setJobData({
      jobName: '',
      dueDate: '',
      priority: 'standard',
      notes: '',
      senderOrganizationIds: [],
      recipientOrganizationIds: [],
      documents: [],
      recipients: []
    });
    setMailGroupSearch('');
    setMailGroupSearchInput('');
    setMailGroupClientFilter('all');
    setMailGroupOrganizationFilter('all');
    setSelectedPreviewGroupId(null);
    setSelectedPreviewDocumentId(null);
    setValidationProgress(0);
    setIsValidating(false);
    setAddressExceptions([]);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(WIZARD_JOB_STORAGE_KEY);
      window.sessionStorage.removeItem(WIZARD_GROUPS_STORAGE_KEY);
      window.sessionStorage.removeItem(MAIL_DETAILS_STORAGE_KEY);
      window.sessionStorage.removeItem(MAIL_DETAILS_ENTERPRISES_KEY);
      window.sessionStorage.removeItem(MAIL_DETAILS_ORGS_KEY);
      window.sessionStorage.removeItem(MAIL_DETAILS_DOCUMENTS_KEY);
      window.sessionStorage.removeItem(MAIL_DETAILS_RETURN_PATH_KEY);
    }
    navigateTo('tracking');
    setWizardStep(1);
  };

  const handleRemoveGroupDocument = (groupId, documentId) => {
    const targetGroup = mailGroups.find(group => group.id === groupId);
    const targetDoc = targetGroup?.documents?.find(doc => doc.id === documentId);
    if (targetDoc?.cacheKey) {
      removePdfFromCache(targetDoc.cacheKey);
    }
    if (
      typeof window !== 'undefined' &&
      targetDoc?.fileUrl &&
      targetDoc.fileUrl.startsWith('blob:')
    ) {
      URL.revokeObjectURL(targetDoc.fileUrl);
    }
    mutateMailGroup(groupId, (group) => {
      const remaining = (group.documents || []).filter(doc => doc.id !== documentId);
      const nextTaskId = remaining.length > 0 ? group.taskId : '';
      return {
        ...group,
        taskId: nextTaskId,
        documents: remaining
      };
    });
  };

  useEffect(() => {
    if (!isWizardHydrated || activeView !== 'wizard') {
      return;
    }
    if (!organizations.length) {
      return;
    }
    const senderIds = jobData.senderOrganizationIds;
    const recipientIds = jobData.recipientOrganizationIds;

    if (!senderIds.length || !recipientIds.length) {
      setMailGroups(prev => prev.filter(group => group.jobId));
      return;
    }

    setMailGroups(prev => {
      const dispatchedGroups = prev.filter(group => group.jobId);
      const workingGroups = prev.filter(group => !group.jobId);
      const combos: Array<{ senderId: string; recipientId: string }> = [];
      senderIds.forEach(senderId => {
        recipientIds.forEach(recipientId => {
          combos.push({ senderId, recipientId });
        });
      });

      const existingMap = new Map<string, MailGroupRecord>();
      workingGroups.forEach(group => {
        const key = buildGroupKey(group.sender?.organizationId || null, group.recipient?.organizationId || null);
        if (!existingMap.has(key)) {
          existingMap.set(key, group);
        }
      });

      const nextGroups = combos.map(({ senderId, recipientId }) => {
        const key = buildGroupKey(senderId, recipientId);
        const existing = existingMap.get(key);
        if (existing) {
          return existing;
        }
        return createMailGroupDraft(senderId, recipientId);
      });

      const existingIds = new Set(dispatchedGroups.map(group => group.id));
      const existingTaskIds = new Set(
        dispatchedGroups
          .map(group => group.taskId)
          .filter((value): value is string => Boolean(value))
      );

      const ensureUniqueValue = (candidate: string, existing: Set<string>, fallbackPrefix: string) => {
        let base = candidate && !/^\s*$/.test(candidate) ? candidate : `${fallbackPrefix}-${existing.size + 1}`;
        if (!existing.has(base)) {
          existing.add(base);
          return base;
        }
        let counter = 1;
        let next = `${base}-${counter}`;
        while (existing.has(next)) {
          counter += 1;
          next = `${base}-${counter}`;
        }
        existing.add(next);
        return next;
      };

      const normalizedNextGroups = nextGroups.map(group => {
        const id = ensureUniqueValue(group.id, existingIds, 'MAIL');
        const hasDocuments = (group.documents || []).length > 0;
        const proposedTaskId = group.taskId || (hasDocuments
          ? buildTaskId(
              group.sender?.organizationId || null,
              group.recipient?.organizationId || group.organizationId || null
            )
          : '');
        const taskId = hasDocuments && proposedTaskId
          ? ensureUniqueValue(proposedTaskId, existingTaskIds, 'TASK')
          : '';
        return {
          ...group,
          id,
          taskId
        };
      });

      return [...dispatchedGroups, ...normalizedNextGroups];
    });
  }, [isWizardHydrated, activeView, jobData.senderOrganizationIds, jobData.recipientOrganizationIds, organizations, createMailGroupDraft]);

  useEffect(() => {
    if (!isWizardHydrated || activeView !== 'wizard') {
      return;
    }

    const draftGroups = mailGroups.filter(group => !group.jobId);

    if (!draftGroups.length) {
      return;
    }

    const derivedSenders = Array.from(
      new Set(
        draftGroups
          .map(group => group.sender?.organizationId || null)
          .filter((value): value is string => Boolean(value))
      )
    );
    const derivedRecipients = Array.from(
      new Set(
        draftGroups
          .map(group => group.recipient?.organizationId || null)
          .filter((value): value is string => Boolean(value))
      )
    );

    setJobData(prev => {
      const next = { ...prev };
      let changed = false;
      if (!arraysShallowEqual(prev.senderOrganizationIds, derivedSenders)) {
        next.senderOrganizationIds = derivedSenders;
        changed = true;
      }
      if (!arraysShallowEqual(prev.recipientOrganizationIds, derivedRecipients)) {
        next.recipientOrganizationIds = derivedRecipients;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [isWizardHydrated, activeView, mailGroups]);

  const handlePreviewSelect = (groupId: string) => {
    setSelectedPreviewGroupId(groupId);
  };

  const toggleMailOption = (groupId: string, key: MailOptionKey) => {
    setSelectedPreviewGroupId(prev => prev || groupId);
    mutateMailGroup(groupId, (group) => {
      const options = normalizeMailOptions(group.mailOptions);
      return {
        ...group,
        mailOptions: {
          ...options,
          [key]: !options[key]
        }
      };
    });
  };

  const handleOrganizationUpdate = (
    organizationId: string,
    updater: (organization: OrganizationRecord) => OrganizationRecord
  ) => {
    setOrganizations(prev =>
      prev.map(org => {
        if (org.id !== organizationId) return org;
        const cloned = {
          ...org,
          addresses: org.addresses.map(address => ({ ...address }))
        };
        return updater(cloned);
      })
    );
  };

  const handleInlineParticipantChange = (
    groupId: string,
    role: ParticipantRole,
    organizationId: string
  ) => {
    const targetOrganization =
      organizations.find(org => org.id === organizationId) || null;
    const defaultAddress =
      targetOrganization?.addresses.find(addr => addr.default) ||
      targetOrganization?.addresses[0] ||
      null;

    mutateMailGroup(groupId, (group) => {
      const participant = ensureParticipant(role, group);
      const updated: ParticipantRecord = {
        ...participant,
        organizationId: targetOrganization?.id || null,
        organizationName: targetOrganization?.name || '',
        addressId: defaultAddress?.id || null,
        address: defaultAddress
          ? normalizeStructuredAddress(defaultAddress)
          : participant.address || null
      };
      if (role === 'recipient' && !updated.contactName) {
        updated.contactName =
          participant.contactName ||
          targetOrganization?.name ||
          group.recipientName ||
          '';
      }
      const nextGroup = applyParticipantToGroup(role, group, updated);
      const hasDocuments = (nextGroup.documents || []).length > 0;
      const senderOrgId = nextGroup.sender?.organizationId || null;
      const recipientOrgId = nextGroup.recipient?.organizationId || nextGroup.organizationId || null;
      return {
        ...nextGroup,
        taskId: hasDocuments ? buildTaskId(senderOrgId, recipientOrgId) : ''
      };
    });
  };

  const persistMailDetailContext = (groupToPersist: MailGroupRecord) => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          MAIL_DETAILS_STORAGE_KEY,
          JSON.stringify(groupToPersist)
        );
        window.sessionStorage.setItem(
          MAIL_DETAILS_ENTERPRISES_KEY,
          JSON.stringify(enterprises)
        );
        window.sessionStorage.setItem(
          MAIL_DETAILS_ORGS_KEY,
          JSON.stringify(organizations)
        );
        window.sessionStorage.setItem(
          MAIL_DETAILS_DOCUMENTS_KEY,
          JSON.stringify(
            (groupToPersist.documents || []).map(doc => serializeDocumentForStorage(doc as DocumentRecord))
          )
        );
      }
    } catch (error) {
      console.warn('Failed to persist mail group for detail view', error);
    }
  };

  const handleNavigateToMailDetails = (groupId: string, overrideGroup?: MailGroupRecord) => {
    const targetGroup = overrideGroup || mailGroups.find(group => group.id === groupId);
    if (!targetGroup) {
      return;
    }
    if (typeof window !== 'undefined') {
      const currentPath =
        window.location.pathname +
        (window.location.search || '') +
        (window.location.hash || '');
      try {
        window.sessionStorage.setItem(MAIL_DETAILS_RETURN_PATH_KEY, currentPath);
      } catch (storageError) {
        console.warn('Failed to persist mail detail return path', storageError);
      }
    }
    persistMailDetailContext(targetGroup);
    router.push(`/mail/${groupId}`);
  };

  const handleSwapParticipants = (groupId: string) => {
    mutateMailGroup(groupId, (group) => {
      const currentSender = group.sender
        ? {
            ...group.sender,
            address: group.sender.address ? { ...group.sender.address } : null
          }
        : null;
      const currentRecipient = group.recipient
        ? {
            ...group.recipient,
            address: group.recipient.address ? { ...group.recipient.address } : null
          }
        : null;
      const nextSender = currentRecipient
        ? {
            ...currentRecipient,
            contactName: currentRecipient.contactName || currentRecipient.organizationName
          }
        : currentSender;
      const nextRecipient = currentSender
        ? {
            ...currentSender,
            contactName: currentSender.contactName || currentSender.organizationName
          }
        : currentRecipient;
      return {
        ...group,
        sender: nextSender,
        recipient: nextRecipient,
        senderEnterpriseId: nextSender?.enterpriseId || group.senderEnterpriseId || null,
        senderContact: nextSender?.contactName || '',
        senderEmail: nextSender?.email || '',
        senderPhone: nextSender?.phone || '',
        senderAddress: nextSender?.address ? formatStructuredAddress(nextSender.address) : '',
        recipientName: nextRecipient?.contactName || nextRecipient?.organizationName || group.recipientName || '',
        address: nextRecipient?.address ? formatStructuredAddress(nextRecipient.address) : '',
        email: nextRecipient?.email || group.email || '',
        phone: nextRecipient?.phone || group.phone || '',
        taskId:
          (group.documents || []).length > 0
            ? buildTaskId(
                nextSender?.organizationId || null,
                nextRecipient?.organizationId || group.organizationId || null
              )
            : ''
      };
    });
  };

  const handleValidateAddresses = () => {
    if (!mailTaskGroups.length) {
      alert('Upload documents to at least one sender & recipient group before running address validation.');
      return;
    }

    setIsValidating(true);
    setValidationProgress(0);
    const snapshot = mailTaskGroups.map(group => ({ ...group }));

    const interval = setInterval(() => {
      setValidationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsValidating(false);

          const updatedTasks = snapshot.map((group, index) => {
            const isException = index % 3 === 0;
            return {
              ...group,
              status: isException ? 'exception' : 'valid',
              exceptionReason: isException ? 'Validation exception' : undefined
            };
          });

          const updatedTaskMap = new Map(updatedTasks.map(group => [group.id, group]));

          const exceptions = updatedTasks
            .filter((r, index) => index % 3 === 0)
            .map(r => ({
              ...r,
              issue: 'Suite number missing - Business address requires suite/unit number',
              suggestedFix: r.address.includes('Suite') ? r.address : `${r.address}, Suite 100`
            }));

          setMailGroups(prev =>
            prev.map(group => updatedTaskMap.get(group.id) || group)
          );
          setEditingMailGroup(current => {
            if (!current) return current;
            const latest = updatedTaskMap.get(current.id);
            return latest || current;
          });
          setAddressExceptions(exceptions);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const handleFixAddress = (recipientId: string, newAddress: string | StructuredAddress) => {
    const structured = typeof newAddress === 'string' ? null : normalizeStructuredAddress(newAddress);
    const formatted = typeof newAddress === 'string'
      ? newAddress
      : formatStructuredAddress(structured);
    mutateMailGroup(recipientId, (group) => ({
      ...group,
      address: formatted,
      status: 'valid',
      exceptionReason: undefined,
      recipient: group.recipient
        ? {
            ...group.recipient,
            address: structured || group.recipient.address,
            addressId: structured?.id || group.recipient.addressId
          }
        : group.recipient
    }));
    setAddressExceptions(addressExceptions.filter(e => e.id !== recipientId));
    setShowFixAddress(false);
    setAddressToFix(null);
    alert('Address updated successfully and marked as valid.');
  };

  const handleSkipException = (recipientId) => {
    mutateMailGroup(recipientId, (group) => ({
      ...group,
      status: 'manual-review',
      exceptionReason: 'Marked for manual review'
    }));
    setAddressExceptions(addressExceptions.filter(e => e.id !== recipientId));
  };

  const applyArchiveFilters = () => {
    const results = sampleJobs.filter(job => {
      const matchesQuery = archiveFilters.query
        ? [job.id, job.name]
            .filter(Boolean)
            .some(value => value.toString().toLowerCase().includes(archiveFilters.query.toLowerCase()))
        : true;
      const matchesStatus = archiveFilters.status === 'all' || job.status === archiveFilters.status;
      const matchesDate = archiveFilters.date ? job.sentDate === archiveFilters.date : true;
      return matchesQuery && matchesStatus && matchesDate;
    });
    setArchiveResults(results);
  };

  useEffect(() => {
    if (sampleJobs.length && !archiveResults.length) {
      setArchiveResults(sampleJobs);
    }
  }, [sampleJobs, archiveResults.length]);

  const updateArchiveFilter = (key, value) => {
    setArchiveFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearArchiveFilters = () => {
    const defaults = {
      query: '',
      status: 'all',
      date: ''
    };
    setArchiveFilters(defaults);
    setArchiveResults(sampleJobs);
  };

  const formatDate = (value) => {
    if (!value) return 'Not set';
    return new Date(value).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString();

  const buildReportPayload = (type) => {
    if (type === 'delivery') {
      const totalItems = sampleJobs.reduce((sum, job) => sum + (job.items || 0), 0);
      const deliveredItems = sampleJobs.reduce((sum, job) => sum + (job.delivered || 0), 0);
      const avgDeliveryRate = totalItems ? ((deliveredItems / totalItems) * 100).toFixed(1) : '0.0';
      return {
        type,
        title: 'Delivery Performance Overview',
        metrics: [
          { label: 'Active Jobs', value: formatNumber(sampleJobs.length) },
          { label: 'Items Delivered', value: formatNumber(deliveredItems) },
          { label: 'Average Delivery Rate', value: `${avgDeliveryRate}%` }
        ],
        rows: sampleJobs.map(job => ({
          id: job.id,
          name: job.name,
          delivered: formatNumber(job.delivered),
          items: formatNumber(job.items),
          rate: job.items ? `${Math.round((job.delivered / job.items) * 100)}%` : '0%'
        }))
      };
    }

    if (type === 'exception') {
          const exceptionRecipients = recipients.filter(r => r.status === 'exception' || r.status === 'manual-review');
          return {
            type,
            title: 'Exception Analysis',
            metrics: [
              { label: 'Open Exceptions', value: formatNumber(addressExceptions.length) },
              { label: 'Mail Groups Requiring Review', value: formatNumber(exceptionRecipients.length) },
              { label: 'Jobs With Exceptions', value: formatNumber(sampleJobs.filter(job => job.exceptions > 0).length) }
            ],
            rows: exceptionRecipients.map(recipient => ({
              recipient: recipient.name,
              address: recipient.address,
              status: recipient.status,
              documents: (recipient.documents || [])
                .map((doc) => (typeof doc === 'string' ? doc : getDocumentLabel(doc)))
                .join(', ') || 'N/A'
            }))
      };
    }

    return null;
  };

  const trackingTimeline = trackingEvents;

  const getStatusBadge = (status) => {
    const statusConfig = {
      'delivered': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'in-transit': { color: 'bg-blue-100 text-blue-800', icon: Truck },
      'pending-approval': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'draft': { color: 'bg-gray-100 text-gray-800', icon: FileText },
      'exception': { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      'pending': { color: 'bg-gray-100 text-gray-800', icon: Clock },
      'manual-review': { color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
      'valid': { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    
    const config = statusConfig[status] || statusConfig['draft'];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    );
  };

  // Modal Components
  const RecipientModal = ({ recipient, onSave, onClose }) => {
    const [formData, setFormData] = useState(recipient || {
      recipientName: '',
      name: '',
      organizationId: '',
      address: '',
      email: '',
      phone: '',
      documents: [],
      deliveryType: 'Certified Mail'
    });
    const [searchRecipient, setSearchRecipient] = useState('');
    const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [isNewRecipient, setIsNewRecipient] = useState(false);

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };
    
    const handleRecipientSelect = (recipient) => {
      const org = organizations.find(o => o.name === recipient.organization);
      if (org) {
        setSelectedOrg(org);
        const defaultAddr = org.addresses.find(a => a.default);
        setFormData({
          ...formData,
          recipientName: recipient.name,
          name: org.name,
          organizationId: org.id,
          address: defaultAddr ? formatStructuredAddress(defaultAddr) : '',
          email: recipient.email
        });
        setSelectedAddress(defaultAddr);
      }
      setSearchRecipient(recipient.name);
      setShowRecipientDropdown(false);
      setIsNewRecipient(false);
    };
    
    const handleOrganizationChange = (orgId) => {
      const org = organizations.find(o => o.id === orgId);
      setSelectedOrg(org);
      if (org) {
        const defaultAddr = org.addresses.find(a => a.default);
        setFormData({
          ...formData,
          name: org.name,
          organizationId: orgId,
          address: defaultAddr ? formatStructuredAddress(defaultAddr) : ''
        });
        setSelectedAddress(defaultAddr);
      }
    };
    
    const handleAddressSelect = (address) => {
      setSelectedAddress(address);
      setFormData({
        ...formData,
        address: address ? formatStructuredAddress(address) : formData.address
      });
    };
    
    const filteredRecipients = existingRecipients.filter(r => 
      r.name.toLowerCase().includes(searchRecipient.toLowerCase()) ||
      r.organization.toLowerCase().includes(searchRecipient.toLowerCase())
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {recipient ? 'Edit Recipient' : 'Add New Recipient'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Searchable Recipient Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchRecipient || formData.recipientName}
                  onChange={(e) => {
                    setSearchRecipient(e.target.value);
                    setShowRecipientDropdown(true);
                    setIsNewRecipient(true);
                    setFormData({...formData, recipientName: e.target.value});
                  }}
                  onFocus={() => setShowRecipientDropdown(true)}
                  placeholder="Search existing recipient or type new name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                
                {showRecipientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                    {filteredRecipients.length > 0 ? (
                      <>
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">Existing Recipients</div>
                        {filteredRecipients.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleRecipientSelect(r)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100"
                          >
                            <div className="text-sm font-medium text-gray-900">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.organization} • {r.email}</div>
                          </button>
                        ))}
                      </>
                    ) : null}
                    {searchRecipient && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewRecipient(true);
                          setShowRecipientDropdown(false);
                          setFormData({...formData, recipientName: searchRecipient});
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-blue-600 text-sm"
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Create new recipient: "{searchRecipient}"
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Organization Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.organizationId}
                  onChange={(e) => handleOrganizationChange(e.target.value)}
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Address Selection */}
              {selectedOrg && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Address *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedAddress?.id || ''}
                    onChange={(e) => {
                      const addr = selectedOrg.addresses.find(a => a.id === e.target.value);
                      handleAddressSelect(addr);
                    }}
                  >
                    <option value="">Select Address</option>
                    {selectedOrg.addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label ? `${addr.label} - ` : ''}{formatStructuredAddress(addr)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {/* Full Address Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Address
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Main St, Suite 100, City, State ZIP"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
            
            {/* Multi-select Documents */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Documents * (Select multiple)
              </label>
              <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                {uploadedFiles.length === 0 ? (
                  <p className="text-sm text-gray-500">No documents uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map(file => (
                      <label key={file.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.documents.includes(file.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                documents: [...formData.documents, file.name]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                documents: formData.documents.filter(d => d !== file.name)
                              });
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{file.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {formData.documents.length > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {formData.documents.length} document(s) selected
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Type *
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.deliveryType}
                onChange={(e) => setFormData({...formData, deliveryType: e.target.value})}
              >
                <option value="Certified Mail">Certified Mail</option>
                <option value="First Class">First Class</option>
                <option value="Priority">Priority</option>
                <option value="Express">Express</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={formData.documents.length === 0}
              >
                {recipient ? 'Save Changes' : 'Add Recipient'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const CSVImportModal = ({ onImport, onClose }) => {
    const [dragActive, setDragActive] = useState(false);
    
    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      onImport();
    };
    
    const downloadCSVTemplate = () => {
      const csvContent = `Name,Address,City,State,ZIP,Email,Phone,Delivery Type
Example Corp,123 Main St,Los Angeles,CA,90001,contact@example.com,(555) 123-4567,Certified Mail
Sample LLC,456 Oak Ave,San Francisco,CA,94102,info@samplellc.com,(555) 234-5678,First Class
Demo Industries,789 Pine St,San Diego,CA,92101,billing@demo.com,(555) 345-6789,Priority`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recipient_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Import Recipients from CSV</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>CSV Format Requirements:</strong> The CSV file should contain columns for:
                Name, Address, City, State, ZIP, Email, Phone, Delivery Type
              </p>
            </div>
          </div>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your CSV file here</p>
            <input
              type="file"
              id="csvFile"
              accept=".csv"
              className="hidden"
              onChange={() => onImport()}
            />
            <label
              htmlFor="csvFile"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Select CSV File
            </label>
            <p className="text-xs text-gray-500 mt-2">Maximum file size: 10MB</p>
          </div>
          
          <div className="mt-4">
            <button
              onClick={downloadCSVTemplate}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Download CSV Template
            </button>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 mt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const FixAddressModal = ({ recipient, onSave, onClose }) => {
    const [newAddress, setNewAddress] = useState(recipient?.suggestedFix || recipient?.address || '');
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Fix Address</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Recipient: <strong>{recipient?.name}</strong></p>
            <p className="text-sm text-red-600 mb-4">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              {recipient?.issue}
            </p>
            
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Corrected Address
            </label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter corrected address"
            />
            
            {recipient?.suggestedFix && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs text-green-800">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Suggested: {recipient.suggestedFix}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(recipient.id, newAddress)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Address
            </button>
          </div>
        </div>
      </div>
    );
  };

  
  const QuickMailModal = ({ onClose, onSend }) => {
    const [quickMailData, setQuickMailData] = useState({
      recipientName: '',
      organizationId: '',
      address: '',
      email: '',
      phone: '',
      documents: [],
      deliveryType: 'Certified Mail',
      notes: ''
    });
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [searchRecipient, setSearchRecipient] = useState('');
    const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    
    const handleRecipientSelect = (recipient) => {
      const org = organizations.find(o => o.name === recipient.organization);
      if (org) {
        setSelectedOrg(org);
        const defaultAddr = org.addresses.find(a => a.default);
        setQuickMailData({
          ...quickMailData,
          recipientName: recipient.name,
          organizationId: org.id,
          address: defaultAddr ? formatStructuredAddress(defaultAddr) : '',
          email: recipient.email
        });
      }
      setSearchRecipient(recipient.name);
      setShowRecipientDropdown(false);
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const docPayload = {
          id: `QUICK-${Date.now()}`,
          name: file.name,
          pages: Math.floor(Math.random() * 120) + 20,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        };
        setUploadedDoc(docPayload);
        setQuickMailData({
          ...quickMailData,
          documents: [docPayload]
        });
      }
    };
    
    const handleSend = () => {
      if (!quickMailData.recipientName || !quickMailData.address || !uploadedDoc) {
        alert('Please fill in all required fields and upload a document');
        return;
      }
      
      onSend(quickMailData);
      alert('Mail job created successfully and sent for processing!');
      onClose();
    };
    
    const filteredRecipients = existingRecipients.filter(r => 
      r.name.toLowerCase().includes(searchRecipient.toLowerCase()) ||
      r.organization.toLowerCase().includes(searchRecipient.toLowerCase())
    );
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Mail</h2>
              <p className="text-sm text-gray-600 mt-1">Send a single document quickly</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document *
              </label>
              {!uploadedDoc ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    id="quickFile"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <label
                    htmlFor="quickFile"
                    className="inline-block bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 cursor-pointer text-sm"
                  >
                    Select PDF
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Upload the document to send</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{uploadedDoc.name}</p>
                      <p className="text-xs text-gray-500">
                        {uploadedDoc.pages} pages • {uploadedDoc.size}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedDoc(null);
                      setQuickMailData({...quickMailData, documents: []});
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Recipient Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchRecipient}
                  onChange={(e) => {
                    setSearchRecipient(e.target.value);
                    setShowRecipientDropdown(true);
                    setQuickMailData({...quickMailData, recipientName: e.target.value});
                  }}
                  onFocus={() => setShowRecipientDropdown(true)}
                  placeholder="Search recipient or type new name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                
                {showRecipientDropdown && filteredRecipients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                    {filteredRecipients.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRecipientSelect(r)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100"
                      >
                        <div className="text-sm font-medium text-gray-900">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.organization} • {r.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Organization and Address */}
            {selectedOrg && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={selectedOrg.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Address
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const addr = selectedOrg.addresses.find(a => a.id === e.target.value);
                      if (addr) {
                        setQuickMailData({...quickMailData, address: formatStructuredAddress(addr)});
                      }
                    }}
                  >
                    <option value="">Choose address...</option>
                    {selectedOrg.addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label ? `${addr.label} - ` : ''}{formatStructuredAddress(addr)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address *
              </label>
              <input
                type="text"
                value={quickMailData.address}
                onChange={(e) => setQuickMailData({...quickMailData, address: e.target.value})}
                placeholder="123 Main St, Suite 100, City, State ZIP"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Email and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={quickMailData.email}
                  onChange={(e) => setQuickMailData({...quickMailData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={quickMailData.phone}
                  onChange={(e) => setQuickMailData({...quickMailData, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Delivery Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Type *
              </label>
              <select
                value={quickMailData.deliveryType}
                onChange={(e) => setQuickMailData({...quickMailData, deliveryType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Certified Mail">Certified Mail</option>
                <option value="First Class">First Class</option>
                <option value="Priority">Priority</option>
                <option value="Express">Express (Next Day)</option>
              </select>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={quickMailData.notes}
                onChange={(e) => setQuickMailData({...quickMailData, notes: e.target.value})}
                rows={2}
                placeholder="Any special instructions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Mail Summary</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Document: {uploadedDoc ? uploadedDoc.name : 'Not uploaded'}</p>
                <p>• Recipient: {quickMailData.recipientName || 'Not specified'}</p>
                <p>• Delivery: {quickMailData.deliveryType}</p>
                <p>• Estimated Cost: $7.95</p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!uploadedDoc || !quickMailData.recipientName || !quickMailData.address}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Mail
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ReportModal = ({ data, onClose }) => {
    if (!data) return null;
    const emptyColSpan = data.type === 'delivery' ? 5 : 4;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{data.title}</h2>
              <p className="text-sm text-gray-600 mt-1">Snapshot generated from current workspace data</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {data.metrics?.map((metric) => (
              <div key={metric.label} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 uppercase">{metric.label}</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {data.type === 'delivery' && (
                    <>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Job ID</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Name</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Delivered</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Items</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Rate</th>
                    </>
                  )}
                  {data.type === 'exception' && (
                    <>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Recipient</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Address</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Status</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Documents</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.rows && data.rows.length > 0 ? (
                  data.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {data.type === 'delivery' && (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.id}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.delivered}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.items}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.rate}</td>
                        </>
                      )}
                      {data.type === 'exception' && (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.recipient}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.address}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.status}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.documents}</td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={emptyColSpan}>
                      No data available for this report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                alert('Exporting report as CSV (stub).');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outbound Mail Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage and track all outbound mail operations</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowQuickMail(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Quick Mail
          </button>
          <button
            type="button"
            onClick={() => navigateTo('wizard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Mail Job
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Jobs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(kpis.activeJobs)}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Items In Transit</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(kpis.itemsInTransit)}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(kpis.deliveredToday)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Exceptions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(kpis.exceptions)}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Mail Jobs</h2>
          <button
            onClick={() => {
              if (sampleJobs.length > 0) {
                setSelectedJob(sampleJobs[0]);
                navigateTo('tracking');
              }
            }}
            disabled={!sampleJobs.length}
            className={`text-sm font-medium ${sampleJobs.length ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 cursor-not-allowed'}`}
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sampleJobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {job.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.items}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${(job.delivered / job.items * 100)}%`}}
                        />
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round(job.delivered / job.items * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        navigateTo('tracking');
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-600">
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ArchiveView = () => {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mail Archive</h1>
          <p className="text-gray-600 mt-1">Search and retrieve historical mail jobs</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={archiveFilters.query}
                onChange={(e) => updateArchiveFilter('query', e.target.value)}
                placeholder="Job ID, recipient, tracking..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sent Date</label>
              <input
                type="date"
                value={archiveFilters.date}
                onChange={(e) => updateArchiveFilter('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={archiveFilters.status}
                onChange={(e) => updateArchiveFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="in-transit">In Transit</option>
                <option value="pending-approval">Pending Approval</option>
                <option value="draft">Draft</option>
                <option value="exception">Exception</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={clearArchiveFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear Filters
            </button>
            <button
              onClick={applyArchiveFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Search className="w-4 h-4 mr-2" />
              Search Archive
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Archived Mail Jobs</h2>
            <span className="text-sm text-gray-500">{archiveResults.length} result(s)</span>
          </div>
          <div className="p-6">
            {archiveResults.length === 0 ? (
              <div className="text-center py-10">
                <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No archive records match your filters.</p>
                <p className="text-sm text-gray-500 mt-2">Adjust filters or clear them to see more results.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {archiveResults.map(job => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.id}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{job.name}</td>
                        <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{job.sentDate ? formatDate(job.sentDate) : 'Not sent'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{job.items}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const ReportsView = () => (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Generate detailed reports and performance metrics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <button
          onClick={() => {
            const payload = buildReportPayload('delivery');
            if (payload) {
              setReportModal(payload);
            } else {
              alert('No data available for delivery performance yet.');
            }
          }}
          className="bg-white text-left rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <TrendingUp className="w-8 h-8 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Performance</h3>
          <p className="text-sm text-gray-600">On-time delivery rates, average transit times, and carrier performance</p>
          <span className="mt-4 inline-flex items-center text-blue-600 text-sm font-medium">Generate Report <ChevronRight className="w-4 h-4 ml-1" /></span>
        </button>

        <button
          onClick={() => {
            const payload = buildReportPayload('exception');
            if (payload) {
              setReportModal(payload);
            } else {
              alert('No exceptions recorded — great job!');
            }
          }}
          className="bg-white text-left rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <AlertCircle className="w-8 h-8 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Exception Analysis</h3>
          <p className="text-sm text-gray-600">Address validation failures, returned mail, and resolution times</p>
          <span className="mt-4 inline-flex items-center text-blue-600 text-sm font-medium">Generate Report <ChevronRight className="w-4 h-4 ml-1" /></span>
        </button>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Quick Stats - Last 30 Days</h2>
          <button
            onClick={() => alert('Export triggered (stub)')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Export All Data
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Mail Sent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(reportSummaries.totalMailSent)}</p>
              <p className="text-xs text-green-600 mt-1">Projected based on job pipeline</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{reportSummaries.deliveryRate}%</p>
              <p className="text-xs text-green-600 mt-1">Improving over last cycle</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Delivery Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{reportSummaries.averageDeliveryTime} days</p>
              <p className="text-xs text-blue-600 mt-1">Calculated from job mix</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated Spend</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${reportSummaries.estimatedSpend}</p>
              <p className="text-xs text-gray-500 mt-1">Assumes $7.95 per mail piece</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const MailJobWizard = () => {
    const OrganizationMultiSelect: React.FC<{
      label: string;
      description?: string;
      selectedIds: string[];
      onChange: (next: string[]) => void;
    }> = ({ label, description, selectedIds, onChange }) => {
      const [query, setQuery] = useState('');
      const filteredOrgs = useMemo(() => {
        const trimmed = query.trim().toLowerCase();
        if (!trimmed) {
          return organizations;
        }
        return organizations.filter(org => org.name.toLowerCase().includes(trimmed));
      }, [organizations, query]);

      const toggleSelection = useCallback(
        (id: string) => {
          onChange(
            selectedIds.includes(id)
              ? selectedIds.filter(item => item !== id)
              : [...selectedIds, id]
          );
        },
        [onChange, selectedIds]
      );

      return (
        <div>
          <div className="flex items-start justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">{label}</label>
              {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            </div>
            <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
          </div>
          <div className="mt-2">
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search organizations..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-white">
              {filteredOrgs.length ? (
                filteredOrgs.map(org => {
                  const checked = selectedIds.includes(org.id);
                  return (
                    <label
                      key={org.id}
                      className="flex items-start gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={checked}
                        onChange={() => toggleSelection(org.id)}
                      />
                      <span>
                        <span className="font-medium text-gray-800">{org.name}</span>
                        <span className="block text-xs text-gray-500">
                          {describePrimaryAddress(org) || 'No primary address on file'}
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-sm text-gray-500">No organizations match your search.</p>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Mail Job</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${wizardStep >= step.number 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-500'}`}>
                  {wizardStep > step.number ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-full h-0.5 mx-2 ${
                    wizardStep > step.number ? 'bg-blue-600' : 'bg-gray-300'
                  }`} style={{width: '60px'}} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step) => (
              <div key={step.number} className="text-xs text-gray-600 text-center" style={{width: '80px'}}>
                {step.name}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {wizardStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Details</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Q4 Tax Returns - California"
                    defaultValue={jobData.jobName}
                    ref={jobNameInputRef}
                    onChange={(event) => {
                      jobNameDraftRef.current = event.target.value;
                    }}
                    onBlur={() => {
                      if (!isWizardHydrated) {
                        return;
                      }
                      setJobData(prev => {
                        if (prev.jobName === jobNameDraftRef.current) {
                          return prev;
                        }
                        return {
                          ...prev,
                          jobName: jobNameDraftRef.current
                        };
                      });
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={jobData.dueDate}
                    onChange={(event) => {
                      const { value } = event.target;
                      setJobData(prev => ({
                        ...prev,
                        dueDate: value
                      }));
                    }}
                  />
                </div>
                
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={jobData.priority}
                  onChange={(event) => {
                    const { value } = event.target;
                    setJobData(prev => ({
                      ...prev,
                      priority: value
                    }));
                  }}
                >
                  <option value="low">Low</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <OrganizationMultiSelect
                  label="Sender Organizations *"
                  description="Choose one or more sender entities for this job."
                  selectedIds={jobData.senderOrganizationIds}
                  onChange={(next) =>
                    setJobData(prev => ({
                      ...prev,
                      senderOrganizationIds: next
                    }))
                  }
                />
                <OrganizationMultiSelect
                  label="Recipient Organizations *"
                  description="Each selected recipient will generate sender & recipient combinations."
                  selectedIds={jobData.recipientOrganizationIds}
                  onChange={(next) =>
                    setJobData(prev => ({
                      ...prev,
                      recipientOrganizationIds: next
                    }))
                  }
                />
              </div>
              {jobData.senderOrganizationIds.length === 0 && (
                <p className="text-xs text-red-600">
                  Select at least one sender organization to continue.
                </p>
              )}
              {jobData.recipientOrganizationIds.length === 0 && (
                <p className="text-xs text-red-600">
                  Select at least one recipient organization to continue.
                </p>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any special instructions or notes..."
                  value={jobData.notes}
                  onChange={(event) => {
                    const { value } = event.target;
                    setJobData(prev => ({
                      ...prev,
                      notes: value
                    }));
                  }}
                />
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Sender & Recipient Groups</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Cards are created for each sender and recipient combination you choose in the Job Details step. Showing {displayedMailGroupCount} combination{displayedMailGroupCount === 1 ? '' : 's'}
                      {isFilteringMailGroups && totalMailGroupCount !== displayedMailGroupCount
                        ? ` of ${totalMailGroupCount}`
                        : ''}.
                    </p>
                  </div>
                  {isFilteringMailGroups && (
                    <button
                      onClick={clearMailGroupFilters}
                      className="self-start inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset filters
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="w-full lg:max-w-md">
                    <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                      Search sender & recipient groups
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={mailGroupSearchInputRef}
                        type="text"
                        value={mailGroupSearchInput}
                        onChange={(event) => setMailGroupSearchInput(event.target.value)}
                        placeholder="Search by sender, recipient, address, document, or task…"
                        autoComplete="off"
                        className="w-full rounded-md border border-gray-300 pl-9 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Search sender and recipient groups"
                      />
                      {mailGroupSearchInput && (
                        <button
                          type="button"
                          onClick={() => {
                            setMailGroupSearchInput('');
                            setMailGroupSearch('');
                            mailGroupSearchInputRef.current?.focus();
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-end sm:gap-4 lg:w-auto">
                    <div className="w-full sm:w-48">
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                        Client
                      </label>
                      <select
                        value={mailGroupClientFilter}
                        onChange={(event) => setMailGroupClientFilter(event.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All clients</option>
                        {enterprises.map((enterprise) => (
                          <option key={enterprise.id} value={enterprise.id}>
                            {enterprise.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full sm:w-52">
                      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                        Organization
                      </label>
                      <select
                        value={mailGroupOrganizationFilter}
                        onChange={(event) => setMailGroupOrganizationFilter(event.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All organizations</option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {mailGroups.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">No sender & recipient groups generated yet</p>
                  <p className="text-sm text-gray-500">
                    Select at least one sender and one recipient in Job Details to automatically create combinations.
                  </p>
                </div>
              ) : displayedMailGroupCount === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-10 text-center">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">No sender & recipient groups match your filters</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Try adjusting your search keywords or filter selections to see more combinations.
                  </p>
                  <button
                    onClick={clearMailGroupFilters}
                    className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {filteredMailGroups.map((group) => (
                    <MailGroupCard
                      key={group.id}
                      group={group}
                      enterprises={enterprises}
                      organizations={organizations}
                      onFileUpload={(files) => handleGroupFileUpload(group.id, files)}
                      onDeliveryChange={(value) => mutateMailGroup(group.id, current => ({
                        ...current,
                        deliveryType: value
                      }))}
                      onSwapParticipants={() => handleSwapParticipants(group.id)}
                      onSendModeChange={(mode) =>
                        mutateMailGroup(group.id, (current) => ({
                          ...current,
                          sendMode: mode
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Validate & Preview</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Validate mailing addresses, review documents, and fine-tune delivery options before approval.
                  </p>
                </div>
                {!isValidating && (
                  <button
                    onClick={handleValidateAddresses}
                    disabled={!mailTaskGroups.length}
                    className={`px-4 py-2 rounded-md flex items-center ${mailTaskGroups.length ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {validationProgress === 0 ? 'Start Validation' : 'Re-run Validation'}
                  </button>
                )}
              </div>

              {isValidating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5 mr-3 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Validating Addresses...</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Checking {mailTaskGroups.length} group{mailTaskGroups.length === 1 ? '' : 's'} with USPS Address Validation API
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${validationProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {validationProgress === 100 && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-900 font-medium">Valid Mail</span>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {recipientStats.validCount}
                      </p>
                      <p className="text-sm text-green-700">Ready to send</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-yellow-900 font-medium">Corrected</span>
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">{recipientStats.correctedCount}</p>
                      <p className="text-sm text-yellow-700">Auto-corrected</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-red-900 font-medium">Exceptions</span>
                        <X className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-2xl font-bold text-red-900">{recipientStats.exceptionsCount}</p>
                      <p className="text-sm text-red-700">Need review</p>
                    </div>
                  </div>

                  {addressExceptions.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Address Exceptions</h3>
                      <div className="space-y-2">
                        {addressExceptions.map((exception) => (
                          <div key={exception.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{exception.name}</p>
                                <p className="text-sm text-gray-600 mt-1">{exception.address}</p>
                                <p className="text-xs text-red-600 mt-2 flex items-center">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  {exception.issue}
                                </p>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setAddressToFix(exception);
                                    setShowFixAddress(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  Fix Address
                                </button>
                                <button
                                  onClick={() => handleSkipException(exception.id)}
                                  className="text-gray-600 hover:text-gray-800 text-sm"
                                >
                                  Skip
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-green-900">All addresses validated successfully!</p>
                          <p className="text-sm text-green-700 mt-1">You can proceed to the next step.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Mail Validation Grid</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Showing {mailTaskGroups.length} mail item{mailTaskGroups.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onChange={(event) => {
                            const value = event.target.value;
                            if (value === 'recipient') {
                              setMailGroups(prev => {
                                const sorted = [...prev];
                                sorted.sort((a, b) => (a.recipientName || '').localeCompare(b.recipientName || ''));
                                return sorted;
                              });
                              return;
                            }
                            if (value === 'sender') {
                              setMailGroups(prev => {
                                const sorted = [...prev];
                                sorted.sort((a, b) =>
                                  (a.sender?.organizationName || '').localeCompare(b.sender?.organizationName || '')
                                );
                                return sorted;
                              });
                              return;
                            }
                            if (value === 'documents') {
                              setMailGroups(prev => {
                                const sorted = [...prev];
                                sorted.sort((a, b) => (b.documents?.length || 0) - (a.documents?.length || 0));
                                return sorted;
                              });
                              return;
                            }
                            if (value === 'delivery') {
                              setMailGroups(prev => {
                                const sorted = [...prev];
                                sorted.sort((a, b) => (a.deliveryType || '').localeCompare(b.deliveryType || ''));
                                return sorted;
                              });
                            }
                          }}
                        >
                          <option value="default">Sort by: Default</option>
                          <option value="recipient">Recipient name</option>
                          <option value="sender">Sender name</option>
                          <option value="documents">Document count</option>
                          <option value="delivery">Delivery type</option>
                        </select>
                      </div>
                    </div>
                    {mailTaskGroups.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">
                        No mail items available for validation. Attach documents to a sender & recipient group in the previous step to create mail tasks.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task ID</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sender</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mail Handling</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {mailTaskGroups.map((group) => {
                              const docs = group.documents || [];
                              const previewDocs = docs.slice(0, 2);
                              const remainingDocs = docs.length - previewDocs.length;
                              const isSelected = selectedPreviewGroupId === group.id;
                              const senderOptionValue = group.sender?.organizationId || '';
                              const recipientOptionValue = group.recipient?.organizationId || '';
                              const sendMode = group.sendMode === 'individual' ? 'individual' : 'grouped';
                              return (
                                <tr
                                  key={group.id}
                                  onClick={() => handlePreviewSelect(group.id)}
                                  className={`align-top cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                >
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.taskId || group.id}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <div
                                      className="min-w-[200px]"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <SearchableSelect
                                        id={`sender-${group.id}`}
                                        value={senderOptionValue}
                                        onChange={(value) => handleInlineParticipantChange(group.id, 'sender', value)}
                                        options={organizationOptions}
                                        placeholder="Select sender"
                                        allowClear={false}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {group.senderAddress || 'Primary address not set'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <div
                                      className="min-w-[200px]"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <SearchableSelect
                                        id={`recipient-${group.id}`}
                                        value={recipientOptionValue}
                                        onChange={(value) => handleInlineParticipantChange(group.id, 'recipient', value)}
                                        options={organizationOptions}
                                        placeholder="Select recipient"
                                        allowClear={false}
                                      />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                      {group.address || 'No address provided'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    <span className="text-gray-900 font-medium">{docs.length}</span> file(s)
                                    {previewDocs.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {previewDocs.map((doc) => {
                                          const label = getDocumentLabel(doc);
                                          return (
                                            <span
                                              key={doc.id}
                                              className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                                            >
                                              <FileText className="w-3 h-3" />
                                              {label.length > 20 ? `${label.slice(0, 17)}...` : label}
                                              <button
                                                type="button"
                                                aria-label="Remove document from mail"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  handleRemoveGroupDocument(group.id, doc.id);
                                                }}
                                                className="inline-flex items-center justify-center rounded-full border border-transparent p-0.5 text-red-600 hover:text-red-800"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </span>
                                          );
                                        })}
                                        {remainingDocs > 0 && (
                                          <span className="text-xs text-gray-500">+{remainingDocs} more</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <div
                                      className="inline-flex rounded-md border border-gray-200 bg-gray-50"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          mutateMailGroup(group.id, current => ({
                                            ...current,
                                            sendMode: 'grouped'
                                          }))
                                        }
                                        className={`px-3 py-1 text-xs font-medium ${
                                          sendMode === 'grouped'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                      >
                                        Group
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          mutateMailGroup(group.id, current => ({
                                            ...current,
                                            sendMode: 'individual'
                                          }))
                                        }
                                        className={`px-3 py-1 text-xs font-medium ${
                                          sendMode === 'individual'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                      >
                                        Separate
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <select
                                      className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      value={group.deliveryType || 'Certified Mail'}
                                      onClick={(event) => event.stopPropagation()}
                                      onChange={(event) => {
                                        event.stopPropagation();
                                        mutateMailGroup(group.id, (current) => ({
                                          ...current,
                                          deliveryType: event.target.value
                                        }));
                                      }}
                                    >
                                      <option>Certified Mail</option>
                                      <option>First Class</option>
                                      <option>Priority</option>
                                      <option>Express</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handlePreviewSelect(group.id);
                                        }}
                                        className={`flex items-center gap-1 text-sm ${
                                          isSelected ? 'text-blue-600' : 'text-gray-600 hover:text-gray-800'
                                        }`}
                                      >
                                        <Eye className="w-4 h-4" />
                                        Preview
                                      </button>
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleNavigateToMailDetails(group.id, group);
                                        }}
                                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                                      >
                                        <ExternalLink className="w-4 h-4" />
                                        Mail Details
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {mailTaskGroups.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {mailTaskGroups.length} mail item{mailTaskGroups.length === 1 ? '' : 's'} configured
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {totalDocumentsAcrossMails} document{totalDocumentsAcrossMails === 1 ? '' : 's'} attached across all mails.
                        </p>
                      </div>
                      {!isValidating && (
                        <button
                          onClick={handleValidateAddresses}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Re-run Validation
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-5 h-full flex flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Mail Preview & Options</h3>
                        <p className="text-xs text-gray-500 mt-1">Inspect documents and delivery preferences for the selected mail.</p>
                      </div>
                      {selectedPreviewGroup && (
                        <button
                          onClick={() => handleNavigateToMailDetails(selectedPreviewGroup.id, selectedPreviewGroup)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Mail Details
                        </button>
                      )}
                    </div>
                    <div className="mt-4 flex-1 flex flex-col">
                      {selectedPreviewGroup ? (
                        <>
                          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                            <div className="aspect-[8.5/11] bg-gray-100 flex items-center justify-center">
                              {selectedPreviewDocument && selectedPreviewDocument.fileUrl ? (
                                <iframe
                                  src={selectedPreviewDocument.fileUrl}
                                  title={getDocumentLabel(selectedPreviewDocument)}
                                  className="w-full h-full"
                                />
                              ) : (
                                <div className="text-center px-4">
                                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600">
                                    {previewDocuments.length
                                      ? 'Preview available once the document is accessible.'
                                      : 'Upload documents to preview.'}
                                  </p>
                                </div>
                              )}
                            </div>
                            <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {selectedPreviewDocument ? getDocumentLabel(selectedPreviewDocument) : 'No document selected'}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {selectedPreviewDocument?.pages
                                    ? `${selectedPreviewDocument.pages} pages`
                                    : 'PDF document'}
                                </p>
                              </div>
                              {selectedPreviewDocument?.fileUrl && (
                                <a
                                  href={selectedPreviewDocument.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <Download className="w-4 h-4" />
                                  Open
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs uppercase text-gray-400">Documents in this mail</p>
                            {previewDocuments.length ? (
                              <div className="mt-2 space-y-2">
                                {previewDocuments.map((doc) => {
                                  const label = getDocumentLabel(doc);
                                  const isActive = doc.id === selectedPreviewDocumentId;
                                  return (
                                    <div
                                      key={doc.id}
                                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                                        isActive
                                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => setSelectedPreviewDocumentId(doc.id)}
                                        className="flex flex-1 items-center justify-between text-left"
                                      >
                                        <span className="flex items-center gap-2">
                                          <FileText className="w-4 h-4" />
                                          {label}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {doc.pages ? `${doc.pages}p` : ''}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Remove document"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleRemoveGroupDocument(selectedPreviewGroup.id, doc.id);
                                        }}
                                        className="ml-2 inline-flex items-center justify-center rounded-full border border-transparent p-1 text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-gray-500">
                                No documents attached to this mail yet.
                              </p>
                            )}
                          </div>
                          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-700">
                            <div className="flex flex-col">
                              <span className="text-xs uppercase text-gray-400">Recipient</span>
                              <span className="mt-1 text-gray-900">{selectedPreviewGroup.recipientName || selectedPreviewGroup.name || 'Recipient not set'}</span>
                              <span className="text-xs text-gray-500 mt-1">{previewRecipientAddress}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs uppercase text-gray-400">Sender</span>
                              <span className="mt-1 text-gray-900">{selectedPreviewGroup.sender?.organizationName || 'Not selected'}</span>
                              <span className="text-xs text-gray-500 mt-1">{previewSenderAddress}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs uppercase text-gray-400">Delivery Type</span>
                              <span className="mt-1 text-gray-900">{selectedPreviewGroup.deliveryType || 'Certified Mail'}</span>
                            </div>
                          </dl>
                          <div className="mt-4">
                            <h4 className="text-xs uppercase text-gray-400">Mail Options</h4>
                            <div className="mt-2 space-y-2">
                              {MAIL_OPTION_CONFIG.map(option => (
                                <label key={option.key} className="flex items-start gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedMailOptions[option.key]}
                                    onChange={() => toggleMailOption(selectedPreviewGroup.id, option.key)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{option.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 border border-dashed border-gray-300 rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500 flex items-center justify-center">
                          Select a mail item from the grid to preview documents and delivery options.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {showFixAddress && addressToFix && (
                <FixAddressModal 
                  recipient={addressToFix}
                  onSave={handleFixAddress}
                  onClose={() => {
                    setShowFixAddress(false);
                    setAddressToFix(null);
                  }}
                />
              )}
            </div>
          )}


          {wizardStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Approval</h2>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Pending Approval</p>
                    <p className="text-sm text-yellow-700 mt-1">This job requires manager approval before dispatch</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Job Summary for Approval</h3>
                
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{jobData.jobName || 'Not specified'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                    <dd className="mt-1 text-sm text-gray-900">{jobData.priority}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(jobData.dueDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Recipients</dt>
                    <dd className="mt-1 text-sm text-gray-900">{recipientStats.total}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Cost</dt>
                    <dd className="mt-1 text-sm text-gray-900">${estimatedCost}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Sender Organization</dt>
                    <dd className="mt-1 text-sm text-gray-900">{senderSummary}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Recipient Organization</dt>
                    <dd className="mt-1 text-sm text-gray-900">{recipientSummary}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Job Notes</dt>
                    <dd className="mt-1 text-sm text-gray-900">{jobData.notes || 'No additional notes provided.'}</dd>
                  </div>
                </dl>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Comments
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add any notes for the approver..."
                  />
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Save as Draft
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Submit for Approval
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => navigateToStep(Math.max(1, wizardStep - 1))}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={wizardStep === 1}
          >
            Previous
          </button>
          <button
            onClick={() => {
              if (wizardStep === 1) {
                if (!jobData.senderOrganizationIds.length) {
                  alert('Please select at least one sender organization before continuing.');
                  return;
                }
                if (!jobData.recipientOrganizationIds.length) {
                  alert('Please select at least one recipient organization before continuing.');
                  return;
                }
                navigateToStep(2);
                return;
              }
              if (wizardStep === 2) {
                if (mailTaskGroups.length === 0) {
                  alert('Upload documents to at least one sender & recipient group before proceeding.');
                  return;
                }
                const missingRecipientAddress = mailTaskGroups.filter(group => !group.address);
                if (missingRecipientAddress.length) {
                  alert('Please provide a recipient address for every sender & recipient group.');
                  return;
                }
                navigateToStep(3);
                return;
              }
              if (wizardStep === 3) {
                if (mailTaskGroups.length === 0) {
                  alert('No sender & recipient groups available to validate.');
                  return;
                }
                navigateToStep(4);
                return;
              }
              if (wizardStep === steps.length) {
                finalizeAndDispatchJob();
                return;
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wizardStep === steps.length ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    );
  };

  const TrackingView = () => {
    const [expandedRow, setExpandedRow] = useState(null);
    const jobRecipients = useMemo(() => {
      if (selectedJob) {
        const matches = recipients.filter(recipient => recipient.jobId === selectedJob.id);
        if (matches.length > 0) {
          return matches;
        }
      }
      return recipients.filter(recipient => (recipient.documents?.length || 0) > 0);
    }, [recipients, selectedJob]);
    
    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
          >
            <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
            Back to Dashboard
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Tracking</h1>
              <p className="text-gray-600 mt-1">Track delivery status and manage exceptions</p>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  if (!selectedJob || jobRecipients.length === 0) return;
                  const csvContent = `Job ID,Job Name,Recipient,Address,Tracking Number,Status,Delivery Date\n` +
                    jobRecipients.map(r => 
                      `${selectedJob.id},${selectedJob.name},"${r.name}","${r.address}",${r.trackingNumber || 'N/A'},${r.status},${r.deliveredDate || 'Pending'}`
                    ).join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mail-tracking-${selectedJob.id}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                disabled={!selectedJob || jobRecipients.length === 0}
                className={`px-4 py-2 border border-gray-300 rounded-md flex items-center ${selectedJob && jobRecipients.length > 0 ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
              <button 
                onClick={() => {
                  // Simulate status refresh
                  const updatedRecipients = recipients.map(r => {
                    if (r.status === 'in-transit' && Math.random() > 0.5) {
                      return {
                        ...r,
                        status: 'delivered',
                        deliveredDate: new Date().toISOString().replace('T', ' ').substr(0, 16)
                      };
                    }
                    return r;
                  });
                  setRecipients(updatedRecipients);
                  alert('Status refreshed successfully!');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </button>
            </div>
          </div>
        </div>

        {/* Job Summary Card */}
        {selectedJob && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedJob.name}</h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Hash className="w-4 h-4 mr-1" />
                    {selectedJob.id}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Sent: {selectedJob.sentDate || 'Pending'}
                  </span>
                </div>
              </div>
              {getStatusBadge(selectedJob.status)}
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600">Total Items</p>
                <p className="text-xl font-bold text-gray-900">{selectedJob.items}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600">Delivered</p>
                <p className="text-xl font-bold text-green-900">{selectedJob.delivered}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600">In Transit</p>
                <p className="text-xl font-bold text-blue-900">{selectedJob.inTransit}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600">Exceptions</p>
                <p className="text-xl font-bold text-red-900">{selectedJob.exceptions}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recipients Table with Tracking */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Recipient Tracking</h3>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search recipients..."
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                />
                <button className="text-gray-600 hover:text-gray-900">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Update</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobRecipients.map((recipient) => (
                  <React.Fragment key={recipient.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {recipient.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {recipient.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-mono">
                        {recipient.trackingNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(recipient.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recipient.deliveredDate || 'In Progress'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => setExpandedRow(expandedRow === recipient.id ? null : recipient.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          {expandedRow === recipient.id ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    
                    {expandedRow === recipient.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {recipient.status === 'exception' && (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-red-900">Exception Details</p>
                                <p className="text-sm text-red-700 mt-1">{recipient.exceptionReason}</p>
                                <div className="mt-2 space-x-2">
                                  <button className="text-xs text-blue-600 hover:text-blue-800">Update Address</button>
                                  <button className="text-xs text-blue-600 hover:text-blue-800">Retry Delivery</button>
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">Tracking Timeline</p>
                              <div className="space-y-2">
                                {trackingTimeline.map((event, index) => (
                                  <div key={index} className="flex items-start space-x-3">
                                    <div className="mt-0.5">
                                      {index === trackingTimeline.length - 1 ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <div className="w-4 h-4 rounded-full bg-gray-300" />
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex justify-between">
                                        <p className="text-sm font-medium text-gray-900">{event.event}</p>
                                        <p className="text-xs text-gray-500">{event.timestamp}</p>
                                      </div>
                                      <p className="text-xs text-gray-500">{event.location}</p>
                                      {event.signature && (
                                        <p className="text-xs text-green-600 mt-1">
                                          Signed by: {event.signature}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Loading outbound mail workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <Mail className="w-8 h-8 text-blue-600 mr-2" />
                <span className="text-xl font-bold text-gray-900">MailFlow Pro</span>
              </div>
              <div className="flex space-x-6">
                <button
                  type="button"
                  onClick={() => navigateTo('dashboard')}
                  className={`text-sm font-medium ${isActiveView('dashboard') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('wizard')}
                  className={`text-sm font-medium ${isActiveView('wizard') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Send Mail
                </button>
                <button
                  onClick={() => {
                    if (sampleJobs.length > 0) {
                      setSelectedJob(sampleJobs[0]);
                      navigateTo('tracking');
                    } else {
                      alert('No jobs available to track yet. Create a job first.');
                    }
                  }}
                  className={`text-sm font-medium ${isActiveView('tracking') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Track Mail
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('archive')}
                  className={`text-sm font-medium ${isActiveView('archive') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('reports')}
                  className={`text-sm font-medium ${isActiveView('reports') ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Reports
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Search className="w-5 h-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900 relative">
                <AlertCircle className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {dataError && (
        <div className="px-6 pt-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
            {dataError}
          </div>
        </div>
      )}

      {activeView === 'dashboard' && <Dashboard />}
      {activeView === 'wizard' && <MailJobWizard />}
      {activeView === 'tracking' && <TrackingView />}
      {activeView === 'archive' && <ArchiveView />}
      {activeView === 'reports' && <ReportsView />}
      {reportModal && (
        <ReportModal
          data={reportModal}
          onClose={() => setReportModal(null)}
        />
      )}
      
      {/* Quick Mail Modal */}
      {showQuickMail && (
        <QuickMailModal 
          onClose={() => setShowQuickMail(false)}
          onSend={(data) => {
            const mailId = generateMailGroupId();
            const taskId = generateTaskId();
            const senderOrgForQuickMail =
              selectedSenderOrganizations[0] ||
              (organizations.length ? organizations[0] : null);
            const recipientOrgForQuickMail =
              (data.organizationId
                ? organizations.find(org => org.id === data.organizationId) || null
                : null) || selectedRecipientOrganizations[0] || null;
            const enterpriseDetails = findEnterpriseForOrganizations(
              senderOrgForQuickMail?.id || null,
              recipientOrgForQuickMail?.id || null
            );
            const defaultEnterpriseId = enterpriseDetails?.id || null;
            const normalizedDocs = (data.documents || []).map((doc, index) => {
              const fileName = doc.fileName || doc.referenceKey || doc.name;
              const displayName = doc.displayName || doc.name || fileName;
              return {
                id: doc.id || `${mailId}-DOC-${index}`,
                name: displayName,
                displayName,
                pages: doc.pages || Math.floor(Math.random() * 120) + 30,
                size: doc.size || 'Unknown',
                fileName,
                referenceKey: fileName || displayName,
                fileUrl: doc.fileUrl,
                source: doc.source || 'upload'
              } as DocumentRecord;
            });

            const senderParticipant: ParticipantRecord = {
              enterpriseId: defaultEnterpriseId,
              organizationId: senderOrgForQuickMail?.id || null,
              organizationName: senderOrgForQuickMail?.name || enterpriseDetails?.name || '',
              contactName: enterpriseDetails?.contact || '',
              email: enterpriseDetails?.email || '',
              phone: enterpriseDetails?.phone || '',
              addressId: null,
              address: null
            };
            const recipientParticipant: ParticipantRecord = {
              enterpriseId: defaultEnterpriseId,
              organizationId: recipientOrgForQuickMail?.id || null,
              organizationName: recipientOrgForQuickMail?.name || data.recipientName || '',
              contactName: data.recipientName,
              email: data.email || '',
              phone: data.phone || '',
              addressId: null,
              address: data.address
                ? normalizeStructuredAddress({ streetAddress: data.address })
                : null
            };

            const quickGroup: MailGroupRecord = {
              id: mailId,
              taskId,
              name: data.recipientName,
              recipientName: data.recipientName,
              organizationId: data.organizationId,
              address: data.address,
              email: data.email,
              phone: data.phone,
              senderEnterpriseId: defaultEnterpriseId,
              senderContact: enterpriseDetails?.contact || '',
              senderEmail: enterpriseDetails?.email || '',
              senderPhone: enterpriseDetails?.phone || '',
              senderAddress: '',
              documents: normalizedDocs,
              mailOptions: normalizeMailOptions(data.mailOptions),
              sendMode: 'grouped',
              deliveryType: data.deliveryType,
              status: 'pending',
              trackingNumber: null,
              deliveredDate: null,
              notes: data.notes || '',
              sender: senderParticipant,
              recipient: recipientParticipant
            };

            setMailGroups(prev => [...prev, quickGroup]);
            setUploadedFiles(prev => {
              const existing = new Set(
                prev.map(file => getDocumentReference(file)).filter(Boolean)
              );
              const additions = normalizedDocs.filter(doc => {
                const reference = getDocumentReference(doc);
                return reference ? !existing.has(reference) : true;
              });
              if (!additions.length) {
                return prev;
              }
              return [...prev, ...additions];
            });
          }}
        />
      )}
    </div>
  );
};

export default MailWorkspace;
