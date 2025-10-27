'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Building,
  Phone,
  AtSign,
  Hash,
  User,
  ArrowLeftRight,
  CornerUpLeft,
  ExternalLink
} from 'lucide-react';

const ENTERPRISE_DROPDOWN_LABEL = 'Select sender enterprises';

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

type ParticipantRole = 'sender' | 'recipient';

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
  const [form, setForm] = useState<MailGroupRecord>(group);

  useEffect(() => {
    setForm(group);
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
            {documents.length ? (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-gray-900">{doc.name}</p>
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
            <h3 className="text-sm font-semibold text-gray-900">Delivery & Tracking</h3>
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
  pages?: number;
  size?: string;
  uploadedAt?: string;
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
  documents: DocumentRecord[];
  sender: ParticipantRecord;
  recipient: ParticipantRecord;
  trackingNumber?: string | null;
  deliveredDate?: string | null;
  exceptionReason?: string;
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

type MailGroupCardProps = {
  group: MailGroupRecord;
  enterprises: EnterpriseRecord[];
  organizations: OrganizationRecord[];
  onEdit: () => void;
  onDelete: () => void;
  onFileUpload: (files: FileList | File[]) => void;
  onDeliveryChange: (value: string) => void;
  onOpenDetails: () => void;
  onSwapParticipants: () => void;
};

const MailGroupCard: React.FC<MailGroupCardProps> = ({
  group,
  enterprises,
  organizations,
  onEdit,
  onDelete,
  onFileUpload,
  onDeliveryChange,
  onOpenDetails,
  onSwapParticipants
}) => {
  const senderEnterprise = enterprises.find(ent => ent.id === group.sender?.enterpriseId || group.senderEnterpriseId);
  const senderOrganization = organizations.find(org => org.id === group.sender?.organizationId || group.organizationId);
  const recipientOrganization = organizations.find(org => org.id === group.recipient?.organizationId || group.organizationId);
  const documents = (group.documents || []).map((doc) => typeof doc === 'string'
    ? { id: doc, name: doc }
    : doc
  );
  const displayName = group.name || group.recipientName || 'Unnamed Mail';
  const senderAddress = formatStructuredAddress(group.sender?.address) || group.senderAddress;
  const recipientAddress = formatStructuredAddress(group.recipient?.address) || group.address;

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      onFileUpload(event.dataTransfer.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 flex flex-col space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase text-gray-400 mb-1">Mail Group</p>
          <h3 className="text-lg font-semibold text-gray-900">{displayName}</h3>
          <p className="text-xs text-gray-500 mt-1">Task ID: {group.taskId || group.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenDetails}
            className="px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50 flex items-center"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 flex items-center"
          >
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase text-gray-400 mb-1">Sender</p>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {senderOrganization?.name || senderEnterprise?.name || 'Select sender'}
              </p>
              {senderAddress ? (
                <p className="text-xs text-gray-500 mt-1">{senderAddress}</p>
              ) : senderEnterprise ? (
                <p className="text-xs text-gray-500 mt-1">
                  {senderEnterprise.contact} • {senderEnterprise.email}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">No sender details</p>
              )}
            </div>
            <button
              className="p-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
              onClick={onSwapParticipants}
              title="Swap sender and recipient"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-400 mb-1">Recipient</p>
          <p className="text-sm font-medium text-gray-900">
            {recipientOrganization?.name || displayName}
          </p>
          {recipientAddress ? (
            <p className="text-xs text-gray-500 mt-1">{recipientAddress}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">No address on file</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase text-gray-400 mb-2">Documents</p>
        {documents.length ? (
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
              >
                <FileText className="w-3 h-3 mr-1" />
                {doc.name.length > 28 ? `${doc.name.slice(0, 25)}...` : doc.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No documents attached yet</p>
        )}
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">Drag & drop files here</p>
        <label className="inline-block px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer">
          Browse Files
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf"
            onChange={(event) => {
              if (event.target.files?.length) {
                onFileUpload(event.target.files);
                event.target.value = '';
              }
            }}
          />
        </label>
        <p className="text-xs text-gray-400 mt-2">PDF only · up to 100MB each</p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs uppercase text-gray-400 block mb-1">Delivery Type</label>
          <select
            value={group.deliveryType || 'Certified Mail'}
            onChange={(event) => onDeliveryChange(event.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Certified Mail</option>
            <option>First Class</option>
            <option>Priority</option>
            <option>Express</option>
          </select>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${MAIL_STATUS_STYLES[group.status] || 'bg-gray-100 text-gray-600'}`}>
          {group.status ? group.status.replace('-', ' ') : 'pending'}
        </span>
      </div>
    </div>
  );
};

const OutboundMailSystem = () => {
  const router = useRouter();
  const [currentView, setCurrentView] = useState('dashboard');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showQuickMail, setShowQuickMail] = useState(false);
  const [isMailDrawerOpen, setIsMailDrawerOpen] = useState(false);
  const [editingMailGroup, setEditingMailGroup] = useState<MailGroupRecord | null>(null);
  const [isCreatingMailGroup, setIsCreatingMailGroup] = useState(false);
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
  const recipients = mailGroups;
  const setRecipients = setMailGroups;
  const [sampleJobs, setSampleJobs] = useState([]);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [kpis, setKpis] = useState({
    activeJobs: 0,
    itemsInTransit: 0,
    deliveredToday: 0,
    exceptions: 0
  });

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseDropdownRef = useRef<HTMLDivElement | null>(null);
  const [archiveFilters, setArchiveFilters] = useState({
    query: '',
    jurisdiction: 'all',
    status: 'all',
    date: ''
  });
  const [archiveResults, setArchiveResults] = useState([]);
  const [reportModal, setReportModal] = useState(null);

  const [jobData, setJobData] = useState({
    jobName: '',
    jurisdiction: '',
    dueDate: '',
    priority: 'standard',
    notes: '',
    senderEnterprises: [],
    documents: [],
    recipients: []
  });

  const recipientStats = useMemo(() => {
    const total = recipients.length;
    const exceptionsCount = addressExceptions.length;
    const validCount = Math.max(total - exceptionsCount, 0);
    const correctedCount = Math.min(Math.max(Math.round(total * 0.1), 0), validCount);
    return {
      total,
      validCount,
      correctedCount,
      exceptionsCount
    };
  }, [recipients, addressExceptions]);

  const senderSummary = useMemo(() => {
    if (!jobData.senderEnterprises.length) {
      return 'Not selected';
    }
    const selected = enterprises.filter(ent => jobData.senderEnterprises.includes(ent.id));
    return selected.map(ent => ent.name).join(', ');
  }, [enterprises, jobData.senderEnterprises]);

  const deliveryMix = useMemo(() => {
    if (!recipients.length) {
      return 'Not defined';
    }
    const unique = Array.from(new Set(recipients.map(r => r.deliveryType || 'Certified Mail')));
    return unique.join(', ');
  }, [recipients]);

  const estimatedCost = useMemo(() => {
    if (!recipients.length) return '0.00';
    return (recipients.length * 7.95).toFixed(2);
  }, [recipients]);

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
        const uploaded: DocumentRecord[] = (payload.uploadedFiles || []).map((file: any, index: number) => ({
          id: file.id || `UP-${index}`,
          name: file.name,
          pages: file.pages,
          size: file.size
        }));
        const lookupByName = uploaded.reduce((acc, file) => {
          acc[file.name] = file;
          return acc;
        }, {} as Record<string, DocumentRecord>);

        setEnterprises(enterprisesData);
        setOrganizations(organizationsData);
        setExistingRecipients(payload.existingRecipients || []);
        setUploadedFiles(uploaded);

        const normalizedMailGroups: MailGroupRecord[] = (payload.recipients || []).map((recipient: any, index: number) => {
          const mailId = recipient.id || `MAIL-${String(index + 1).padStart(3, '0')}`;
          const defaultEnterpriseId = recipient.senderEnterpriseId || enterprisesData[0]?.id || null;
          const enterpriseDetails = enterprisesData.find(ent => ent.id === defaultEnterpriseId);
          const senderOrgId =
            recipient.senderOrganizationId ||
            enterpriseDetails?.senderOrganizations?.[0] ||
            recipient.organizationId ||
            null;
          const senderOrg = senderOrgId
            ? organizationsData.find(org => org.id === senderOrgId) || null
            : null;
          const senderAddressSource =
            (senderOrg?.addresses || []).find(addr => addr.id === recipient.senderAddressId) ||
            (senderOrg?.addresses || []).find(addr => addr.default) ||
            (senderOrg?.addresses || [])[0] ||
            null;
          const senderAddress = senderAddressSource
            ? normalizeStructuredAddress(senderAddressSource)
            : recipient.senderAddressParts
            ? normalizeStructuredAddress(recipient.senderAddressParts)
            : null;

          const recipientOrgId =
            recipient.organizationId ||
            enterpriseDetails?.recipientOrganizations?.[0] ||
            null;
          const recipientOrg = recipientOrgId
            ? organizationsData.find(org => org.id === recipientOrgId) || null
            : null;
          const recipientAddress = recipient.addressParts
            ? normalizeStructuredAddress(recipient.addressParts)
            : (recipientOrg?.addresses || []).find(addr => addr.id === recipient.addressId)
            || (recipientOrg?.addresses || []).find(addr => addr.default)
            || (recipientOrg?.addresses || [])[0]
            || null;
          const normalizedRecipientAddress = recipientAddress
            ? normalizeStructuredAddress(recipientAddress)
            : null;

          const documents = (recipient.documents || []).map((doc, docIndex) => {
            if (!doc) return null;
            if (typeof doc === 'object') {
              return {
                id: doc.id || `${mailId}-DOC-${docIndex}`,
                name: doc.name,
                pages: doc.pages || Math.floor(Math.random() * 120) + 30,
                size: doc.size || 'N/A'
              };
            }
            const match = lookupByName[doc];
            if (match) {
              return {
                id: `${mailId}-DOC-${docIndex}`,
                name: match.name,
                pages: match.pages,
                size: match.size
              };
            }
            return {
              id: `${mailId}-DOC-${docIndex}`,
              name: doc,
              pages: Math.floor(Math.random() * 120) + 30,
              size: 'Unknown'
            };
          }).filter(Boolean);

          const derivedRecipientName =
            recipient.recipientName ||
            recipient.name ||
            recipientOrg?.name ||
            '';

          const senderParticipant: ParticipantRecord = {
            enterpriseId: defaultEnterpriseId,
            organizationId: senderOrg?.id || null,
            organizationName: senderOrg?.name || enterpriseDetails?.name,
            contactName: recipient.senderContact || enterpriseDetails?.contact || '',
            email: recipient.senderEmail || enterpriseDetails?.email || '',
            phone: recipient.senderPhone || enterpriseDetails?.phone || '',
            addressId: senderAddress?.id || null,
            address: senderAddress
          };

          const recipientParticipant: ParticipantRecord = {
            enterpriseId: defaultEnterpriseId,
            organizationId: recipientOrg?.id || null,
            organizationName: recipientOrg?.name || derivedRecipientName,
            contactName: derivedRecipientName,
            email: recipient.email || '',
            phone: recipient.phone || '',
            addressId: normalizedRecipientAddress?.id || null,
            address: normalizedRecipientAddress
          };

          return {
            ...recipient,
            id: mailId,
            taskId: recipient.taskId || mailId,
            name: recipient.name || recipientOrg?.name || derivedRecipientName,
            recipientName: derivedRecipientName,
            status: recipient.status || 'pending',
            deliveryType: recipient.deliveryType || 'Certified Mail',
            documents: documents as DocumentRecord[],
            sender: senderParticipant,
            recipient: recipientParticipant,
            senderEnterpriseId: defaultEnterpriseId,
            senderContact: senderParticipant.contactName,
            senderEmail: senderParticipant.email,
            senderPhone: senderParticipant.phone,
            senderAddress: senderParticipant.address ? formatStructuredAddress(senderParticipant.address) : recipient.senderAddress || '',
            organizationId: recipientOrg?.id || null,
            address: recipientParticipant.address ? formatStructuredAddress(recipientParticipant.address) : recipient.address || '',
            email: recipient.email || '',
            phone: recipient.phone || ''
          } as MailGroupRecord;
        });

        setMailGroups(normalizedMailGroups);
        setSampleJobs(payload.jobs || []);
        setTrackingEvents(payload.trackingEvents || []);
        setKpis(payload.kpis || {
          activeJobs: 0,
          itemsInTransit: 0,
          deliveredToday: 0,
          exceptions: 0
        });
        setArchiveResults(payload.jobs || []);
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
        setKpis({
          activeJobs: 0,
          itemsInTransit: 0,
          deliveredToday: 0,
          exceptions: 0
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const allDocs = mailGroups.flatMap(group => 
      (group.documents || []).map(doc => doc.name)
    );
    const uniqueDocs = Array.from(new Set(allDocs));
    setJobData(prev => ({
      ...prev,
      documents: uniqueDocs,
      recipients: mailGroups
    }));
  }, [mailGroups]);

  useEffect(() => {
    if (wizardStep !== 1 && enterpriseDropdownOpen) {
      setEnterpriseDropdownOpen(false);
    }
  }, [wizardStep, enterpriseDropdownOpen]);

  useEffect(() => {
    if (!enterpriseDropdownOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (
        enterpriseDropdownRef.current &&
        target instanceof Node &&
        !enterpriseDropdownRef.current.contains(target)
      ) {
        setEnterpriseDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }, [enterpriseDropdownOpen]);

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
      const rawDocs = window.sessionStorage.getItem(MAIL_DETAILS_DOCUMENTS_KEY);
      if (rawDocs) {
        setUploadedFiles(JSON.parse(rawDocs));
      }
    } catch (storageError) {
      console.warn('Failed to hydrate mail data from detail page storage', storageError);
    }
  }, [isLoadingData]);

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
        return updater({ ...group });
      })
    );
    setEditingMailGroup(current => {
      if (!current || current.id !== groupId) {
        return current;
      }
      return updater({ ...current });
    });
  };

  const buildDocumentFromFile = (file: File, index: number) => ({
    id: `${file.name}-${Date.now()}-${index}`,
    name: file.name,
    pages: Math.floor(Math.random() * 200) + 50,
    size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
  });

  const handleGroupFileUpload = (groupId, files?: FileList | File[]) => {
    if (!files || files.length === 0) {
      return;
    }
    const fileArray = Array.from(files instanceof FileList ? files : files);
    const newDocs = fileArray.map((file, index) => buildDocumentFromFile(file, index));
    mutateMailGroup(groupId, (group) => ({
      ...group,
      documents: [...(group.documents || []), ...newDocs]
    }));
    setUploadedFiles(prev => {
      const existingNames = new Set(prev.map(file => file.name));
      const additions = newDocs.filter(doc => !existingNames.has(doc.name));
      if (!additions.length) {
        return prev;
      }
      return [...prev, ...additions];
    });
  };

  const handleRemoveGroupDocument = (groupId, documentId) => {
    mutateMailGroup(groupId, (group) => ({
      ...group,
      documents: (group.documents || []).filter(doc => doc.id !== documentId)
    }));
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

  const handleNavigateToMailDetails = (groupId: string) => {
    const targetGroup = mailGroups.find(group => group.id === groupId);
    if (!targetGroup) {
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          MAIL_DETAILS_STORAGE_KEY,
          JSON.stringify(targetGroup)
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
          JSON.stringify(uploadedFiles)
        );
      }
    } catch (error) {
      console.warn('Failed to persist mail group for detail view', error);
    }
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
        phone: nextRecipient?.phone || group.phone || ''
      };
    });
  };

  const handleCreateMailGroup = () => {
    const newGroupId = generateMailGroupId();
    const defaultEnterpriseId = jobData.senderEnterprises[0] || enterprises[0]?.id || null;
    const defaultEnterprise = enterprises.find(ent => ent.id === defaultEnterpriseId);
    const defaultSenderOrgId =
      defaultEnterprise?.senderOrganizations?.[0] ||
      organizations[0]?.id ||
      null;
    const defaultRecipientOrgId =
      defaultEnterprise?.recipientOrganizations?.[0] ||
      defaultSenderOrgId ||
      organizations[0]?.id ||
      null;
    const senderOrg = defaultSenderOrgId
      ? organizations.find(org => org.id === defaultSenderOrgId) || null
      : null;
    const recipientOrg = defaultRecipientOrgId
      ? organizations.find(org => org.id === defaultRecipientOrgId) || null
      : null;
    const senderAddress = senderOrg?.addresses.find(addr => addr.default) || senderOrg?.addresses[0] || null;
    const recipientAddress = recipientOrg?.addresses.find(addr => addr.default) || recipientOrg?.addresses[0] || null;
    const draftGroup: MailGroupRecord = {
      id: newGroupId,
      taskId: generateTaskId(),
      name: '',
      recipientName: '',
      address: recipientAddress ? formatStructuredAddress(recipientAddress) : '',
      email: '',
      phone: '',
      senderEnterpriseId: defaultEnterpriseId,
      senderContact: defaultEnterprise?.contact || '',
      senderEmail: defaultEnterprise?.email || '',
      senderPhone: defaultEnterprise?.phone || '',
      senderAddress: senderAddress ? formatStructuredAddress(senderAddress) : '',
      documents: [],
      deliveryType: 'Certified Mail',
      status: 'pending',
      trackingNumber: null,
      deliveredDate: null,
      sender: {
        enterpriseId: defaultEnterpriseId,
        organizationId: senderOrg?.id || null,
        organizationName: senderOrg?.name || defaultEnterprise?.name,
        contactName: defaultEnterprise?.contact || '',
        email: defaultEnterprise?.email || '',
        phone: defaultEnterprise?.phone || '',
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
    setEditingMailGroup(draftGroup);
    setIsCreatingMailGroup(true);
    setIsMailDrawerOpen(true);
  };

  const handleEditMailGroup = (group: MailGroupRecord) => {
    setEditingMailGroup({
      ...group,
      sender: group.sender
        ? {
            ...group.sender,
            address: group.sender.address ? { ...group.sender.address } : null
          }
        : group.sender,
      recipient: group.recipient
        ? {
            ...group.recipient,
            address: group.recipient.address ? { ...group.recipient.address } : null
          }
        : group.recipient,
      documents: [...(group.documents || [])]
    });
    setIsCreatingMailGroup(false);
    setIsMailDrawerOpen(true);
  };

  const handleSaveMailGroup = (groupData: MailGroupRecord) => {
    const normalized: MailGroupRecord = {
      ...groupData,
      name:
        groupData.name ||
        groupData.recipientName ||
        groupData.recipient?.organizationName ||
        '',
      senderAddress: groupData.sender?.address
        ? formatStructuredAddress(groupData.sender.address)
        : groupData.senderAddress,
      address: groupData.recipient?.address
        ? formatStructuredAddress(groupData.recipient.address)
        : groupData.address,
      senderEnterpriseId: groupData.sender?.enterpriseId || groupData.senderEnterpriseId || null,
      senderContact: groupData.sender?.contactName || groupData.senderContact || '',
      senderEmail: groupData.sender?.email || groupData.senderEmail || '',
      senderPhone: groupData.sender?.phone || groupData.senderPhone || '',
      recipientName: groupData.recipient?.contactName || groupData.recipientName || '',
      email: groupData.recipient?.email || groupData.email || '',
      phone: groupData.recipient?.phone || groupData.phone || ''
    };

    if (isCreatingMailGroup) {
      setMailGroups(prev => [...prev, normalized]);
    } else {
      setMailGroups(prev => prev.map(group => group.id === normalized.id ? normalized : group));
    }

    setIsMailDrawerOpen(false);
    setEditingMailGroup(null);
    setIsCreatingMailGroup(false);
  };

  const handleDeleteMailGroup = (groupId) => {
    if (!window.confirm('Are you sure you want to remove this mail group?')) {
      return;
    }
    setMailGroups(mailGroups.filter(group => group.id !== groupId));
    if (editingMailGroup?.id === groupId) {
      handleCloseMailDrawer();
    }
  };

  const handleCloseMailDrawer = () => {
    setIsMailDrawerOpen(false);
    setEditingMailGroup(null);
    setIsCreatingMailGroup(false);
  };

  const handleValidateAddresses = () => {
    if (!mailGroups.length) {
      alert('Please add mail groups before running address validation.');
      return;
    }

    setIsValidating(true);
    setValidationProgress(0);
    const snapshot = mailGroups.map(group => ({ ...group }));

    const interval = setInterval(() => {
      setValidationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsValidating(false);

          const nextGroups = snapshot.map((group, index) => {
            const isException = index % 3 === 0;
            return {
              ...group,
              status: isException ? 'exception' : 'valid',
              exceptionReason: isException ? 'Validation exception' : undefined
            };
          });

          const exceptions = nextGroups
            .filter((r, index) => index % 3 === 0)
            .map(r => ({
              ...r,
              issue: 'Suite number missing - Business address requires suite/unit number',
              suggestedFix: r.address.includes('Suite') ? r.address : `${r.address}, Suite 100`
            }));

          setMailGroups(nextGroups);
          setEditingMailGroup(current => {
            if (!current) return current;
            const latest = nextGroups.find(group => group.id === current.id);
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

  const toggleEnterpriseSelection = (enterpriseId) => {
    setJobData(prev => {
      const exists = prev.senderEnterprises.includes(enterpriseId);
      return {
        ...prev,
        senderEnterprises: exists
          ? prev.senderEnterprises.filter(id => id !== enterpriseId)
          : [...prev.senderEnterprises, enterpriseId]
      };
    });
  };

  const applyArchiveFilters = () => {
    const results = sampleJobs.filter(job => {
      const matchesQuery = archiveFilters.query
        ? [job.id, job.name, job.jurisdiction]
            .filter(Boolean)
            .some(value => value.toString().toLowerCase().includes(archiveFilters.query.toLowerCase()))
        : true;
      const matchesJurisdiction = archiveFilters.jurisdiction === 'all' || job.jurisdiction === archiveFilters.jurisdiction;
      const matchesStatus = archiveFilters.status === 'all' || job.status === archiveFilters.status;
      const matchesDate = archiveFilters.date ? job.sentDate === archiveFilters.date : true;
      return matchesQuery && matchesJurisdiction && matchesStatus && matchesDate;
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
      jurisdiction: 'all',
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

    if (type === 'jurisdiction') {
      const grouped = sampleJobs.reduce((acc, job) => {
        const key = job.jurisdiction || 'Unknown';
        const bucket = acc[key] || { items: 0, delivered: 0, exceptions: 0 };
        bucket.items += job.items || 0;
        bucket.delivered += job.delivered || 0;
        bucket.exceptions += job.exceptions || 0;
        acc[key] = bucket;
        return acc;
      }, {} as Record<string, { items: number; delivered: number; exceptions: number }>);

      const rows = (Object.entries(grouped) as Array<[
        string,
        { items: number; delivered: number; exceptions: number }
      ]>).map(([code, stats]) => ({
        jurisdiction: code,
        items: formatNumber(stats.items),
        delivered: formatNumber(stats.delivered),
        exceptions: formatNumber(stats.exceptions),
        rate: stats.items ? `${Math.round((stats.delivered / stats.items) * 100)}%` : '0%'
      }));

      return {
        type,
        title: 'Jurisdiction Summary',
        metrics: [
          { label: 'Jurisdictions Covered', value: formatNumber(rows.length) },
          { label: 'Total Items', value: formatNumber(sampleJobs.reduce((sum, job) => sum + (job.items || 0), 0)) },
          { label: 'Total Exceptions', value: formatNumber(sampleJobs.reduce((sum, job) => sum + (job.exceptions || 0), 0)) }
        ],
        rows
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
              documents: (recipient.documents || []).map((doc) => typeof doc === 'string' ? doc : doc.name).join(', ') || 'N/A'
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
      const csvContent = `Name,Address,City,State,ZIP,Email,Phone,Jurisdiction Code,Delivery Type
Example Corp,123 Main St,Los Angeles,CA,90001,contact@example.com,(555) 123-4567,CA,Certified Mail
Sample LLC,456 Oak Ave,San Francisco,CA,94102,info@samplellc.com,(555) 234-5678,CA,First Class
Demo Industries,789 Pine St,San Diego,CA,92101,billing@demo.com,(555) 345-6789,CA,Priority`;
      
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
                Name, Address, City, State, ZIP, Email, Phone, Jurisdiction Code, Delivery Type
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
      jurisdiction: '',
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
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jurisdiction
                </label>
                <select
                  value={quickMailData.jurisdiction}
                  onChange={(e) => setQuickMailData({...quickMailData, jurisdiction: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Jurisdiction</option>
                  <option value="CA">California</option>
                  <option value="NY">New York</option>
                  <option value="TX">Texas</option>
                  <option value="FL">Florida</option>
                </select>
              </div>
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
    const emptyColSpan = data.type === 'exception' ? 4 : 5;
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
                  {data.type === 'jurisdiction' && (
                    <>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Jurisdiction</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Items</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Delivered</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Exceptions</th>
                      <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase text-left">Delivery Rate</th>
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
                      {data.type === 'jurisdiction' && (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-900">{row.jurisdiction}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.items}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.delivered}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{row.exceptions}</td>
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
            onClick={() => setCurrentView('wizard')}
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
                setCurrentView('tracking');
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jurisdiction</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {job.jurisdiction}
                    </span>
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
                        setCurrentView('tracking');
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
    const jurisdictions = useMemo(() => Array.from(new Set(sampleJobs.map(job => job.jurisdiction))).filter(Boolean), [sampleJobs]);

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mail Archive</h1>
          <p className="text-gray-600 mt-1">Search and retrieve historical mail jobs</p>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
              <select
                value={archiveFilters.jurisdiction}
                onChange={(e) => updateArchiveFilter('jurisdiction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Jurisdictions</option>
                {jurisdictions.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jurisdiction</th>
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
                        <td className="px-4 py-3 text-sm text-gray-500">{job.jurisdiction}</td>
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
            const payload = buildReportPayload('jurisdiction');
            if (payload) {
              setReportModal(payload);
            } else {
              alert('No jurisdiction data available.');
            }
          }}
          className="bg-white text-left rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
        >
          <Building className="w-8 h-8 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Jurisdiction Summary</h3>
          <p className="text-sm text-gray-600">Mail volumes, costs, and compliance metrics by jurisdiction</p>
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
    const steps = [
      { number: 1, name: 'Job Details', icon: FileText },
      { number: 2, name: 'Mail Groups', icon: Package },
      { number: 3, name: 'Validate', icon: CheckCircle },
      { number: 4, name: 'Preview', icon: Eye },
      { number: 5, name: 'Approve', icon: Check },
      { number: 6, name: 'Dispatch', icon: Send }
    ];

    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => setCurrentView('dashboard')}
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
                    value={jobData.jobName}
                    onChange={(e) => setJobData({...jobData, jobName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jurisdiction *
                  </label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={jobData.jurisdiction}
                    onChange={(e) => setJobData({...jobData, jurisdiction: e.target.value})}
                  >
                    <option value="">Select Jurisdiction</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={jobData.dueDate}
                    onChange={(e) => setJobData({...jobData, dueDate: e.target.value})}
                  />
                </div>
                
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={jobData.priority}
                  onChange={(e) => setJobData({...jobData, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sender Enterprises *
                </label>
                <div className="relative" ref={enterpriseDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setEnterpriseDropdownOpen(!enterpriseDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="text-sm text-gray-700 text-left">
                      {jobData.senderEnterprises.length > 0
                        ? enterprises
                            .filter(ent => jobData.senderEnterprises.includes(ent.id))
                            .map(ent => ent.name)
                            .join(', ')
                        : ENTERPRISE_DROPDOWN_LABEL}
                    </span>
                    {enterpriseDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  {enterpriseDropdownOpen && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {enterprises.length === 0 && (
                        <p className="px-4 py-3 text-sm text-gray-500">No enterprises configured.</p>
                      )}
                      {enterprises.map(enterprise => (
                        <label
                          key={enterprise.id}
                          className="flex items-start px-4 py-3 space-x-3 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={jobData.senderEnterprises.includes(enterprise.id)}
                            onChange={() => toggleEnterpriseSelection(enterprise.id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{enterprise.name}</p>
                            <p className="text-xs text-gray-500">
                              {enterprise.contact} • {enterprise.email}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {jobData.senderEnterprises.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">Select at least one sender to continue.</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any special instructions or notes..."
                  value={jobData.notes}
                  onChange={(e) => setJobData({...jobData, notes: e.target.value})}
                />
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Mail Groups</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Combine sender enterprises, recipients, and documents into flexible mail tasks.
                  </p>
                </div>
                <button
                  onClick={handleCreateMailGroup}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Mail
                </button>
              </div>

              {mailGroups.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-700 font-medium mb-2">No mail groups configured yet</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Create your first mail group to map a sender, recipient, and the supporting documents.
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleCreateMailGroup}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Mail Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {mailGroups.map((group) => (
                    <MailGroupCard
                      key={group.id}
                      group={group}
                      enterprises={enterprises}
                      organizations={organizations}
                      onEdit={() => handleEditMailGroup(group)}
                      onDelete={() => handleDeleteMailGroup(group.id)}
                      onFileUpload={(files) => handleGroupFileUpload(group.id, files)}
                      onDeliveryChange={(value) => mutateMailGroup(group.id, current => ({
                        ...current,
                        deliveryType: value
                      }))}
                      onOpenDetails={() => handleNavigateToMailDetails(group.id)}
                      onSwapParticipants={() => handleSwapParticipants(group.id)}
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
                  <h2 className="text-lg font-semibold text-gray-900">Validate Mail</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Review each mail group, confirm delivery preferences, and resolve any address exceptions before dispatch.
                  </p>
                </div>
                {!isValidating && (
                  <button
                    onClick={handleValidateAddresses}
                    disabled={!mailGroups.length}
                    className={`px-4 py-2 rounded-md flex items-center ${mailGroups.length ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
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
                        Checking {mailGroups.length} mail group addresses with USPS Address Validation API
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

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Mail Validation Grid</h3>
                    <p className="text-xs text-gray-500 mt-1">Showing {mailGroups.length} mail group(s)</p>
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="inline-flex items-center mr-3">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                      Valid
                    </span>
                    <span className="inline-flex items-center mr-3">
                      <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                      Corrected
                    </span>
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                      Exception
                    </span>
                  </div>
                </div>
                {mailGroups.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No mail groups configured. Create mail groups in the previous step to begin validation.
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {mailGroups.map((group) => {
                          const sender = enterprises.find(ent => ent.id === group.senderEnterpriseId);
                          const docs = group.documents || [];
                          const previewDocs = docs.slice(0, 2);
                          const remainingDocs = docs.length - previewDocs.length;
                          return (
                            <tr key={group.id} className="align-top">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{group.taskId || group.id}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <p className="text-gray-900 font-medium">{sender ? sender.name : 'Not selected'}</p>
                                <p className="text-xs text-gray-500 mt-1">{group.senderAddress || sender?.email || '—'}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <p className="text-gray-900 font-medium">{group.recipientName || group.name || 'Recipient not set'}</p>
                                <p className="text-xs text-gray-500 mt-1">{group.address || 'No address provided'}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <span className="text-gray-900 font-medium">{docs.length || 0}</span> file(s)
                                {previewDocs.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {previewDocs.map((doc) => (
                                      <span key={doc.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                        <FileText className="w-3 h-3 mr-1" />
                                        {doc.name.length > 20 ? `${doc.name.slice(0, 17)}...` : doc.name}
                                      </span>
                                    ))}
                                    {remainingDocs > 0 && (
                                      <span className="text-xs text-gray-500">+{remainingDocs} more</span>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <select
                                  className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={group.deliveryType || 'Certified Mail'}
                                  onChange={(event) => mutateMailGroup(group.id, (current) => ({
                                    ...current,
                                    deliveryType: event.target.value
                                  }))}
                                >
                                  <option>Certified Mail</option>
                                  <option>First Class</option>
                                  <option>Priority</option>
                                  <option>Express</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${MAIL_STATUS_STYLES[group.status] || 'bg-gray-100 text-gray-600'}`}>
                                    {(group.status || 'pending').replace('-', ' ')}
                                  </span>
                                  {group.status === 'exception' && (
                                    <button
                                      onClick={() => {
                                        setAddressToFix(group);
                                        setShowFixAddress(true);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      Resolve
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => handleEditMailGroup(group)}
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  Mail Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {mailGroups.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Mail groups ready for dispatch: {mailGroups.filter(group => group.status === 'valid').length}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Exceptions pending: {mailGroups.filter(group => group.status === 'exception' || group.status === 'manual-review').length}
                    </p>
                  </div>
                  {!isValidating && (
                    <button
                      onClick={handleValidateAddresses}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Validate Again
                    </button>
                  )}
                </div>
              )}

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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Preview & Personalization</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Mail Piece Preview</h3>
                  <div className="border border-gray-300 rounded-lg p-4 bg-white">
                    <div className="aspect-[8.5/11] bg-gray-100 rounded flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Document Preview</p>
                        <p className="text-xs text-gray-500 mt-1">{uploadedFiles[0]?.name || 'No document selected yet'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Mail Options</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-700">Include certified mail receipt</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-gray-700">Add return envelope</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-700">Request delivery confirmation</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-gray-700">Include cover letter</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Summary</h4>
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Total Recipients:</dt>
                        <dd className="font-medium">{recipientStats.total}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Sender:</dt>
                        <dd className="font-medium">{senderSummary}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Delivery Method:</dt>
                        <dd className="font-medium">{deliveryMix}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Estimated Cost:</dt>
                        <dd className="font-medium">${estimatedCost}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Est. Delivery:</dt>
                        <dd className="font-medium">3-5 Business Days</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          )}

          {wizardStep === 5 && (
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
                    <dt className="text-sm font-medium text-gray-500">Jurisdiction</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {jobData.jurisdiction ? `${jobData.jurisdiction}` : 'Not selected'}
                    </dd>
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
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Sender Enterprises</dt>
                    <dd className="mt-1 text-sm text-gray-900">{senderSummary}</dd>
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

          {wizardStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dispatch</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Ready to Dispatch</p>
                    <p className="text-sm text-green-700 mt-1">All validations passed and approval received</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Dispatch Method</h3>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="dispatch" className="mr-3" defaultChecked />
                      <div>
                        <p className="font-medium text-gray-900">USPS Certified Mail</p>
                        <p className="text-xs text-gray-500">Tracking and proof of delivery included</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="dispatch" className="mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">FedEx Priority</p>
                        <p className="text-xs text-gray-500">1-2 day delivery with signature</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="dispatch" className="mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Hybrid Mail Provider</p>
                        <p className="text-xs text-gray-500">Print and mail service</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Dispatch Schedule</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center">
                        <input type="radio" name="schedule" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-700">Dispatch immediately</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input type="radio" name="schedule" className="mr-2" />
                        <span className="text-sm text-gray-700">Schedule for later</span>
                      </label>
                      <input
                        type="datetime-local"
                        className="mt-2 ml-6 px-3 py-1 border border-gray-300 rounded-md text-sm"
                        disabled
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Dispatch Summary</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• {recipientStats.total || 'No'} mail piece(s) ready</li>
                      <li>• Sender: {senderSummary}</li>
                      <li>• Delivery mix: {deliveryMix}</li>
                      <li>• Estimated cost: ${estimatedCost}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center">
                  <Send className="w-4 h-4 mr-2" />
                  Dispatch Now
                </button>
              </div>
            </div>
          )}
        </div>

        {isMailDrawerOpen && editingMailGroup && (
          <MailDetailsDrawer
            open={isMailDrawerOpen}
            group={editingMailGroup}
            enterprises={enterprises}
            organizations={organizations}
            onClose={handleCloseMailDrawer}
            onSave={handleSaveMailGroup}
            onChange={setEditingMailGroup}
            onUpload={(files) => handleGroupFileUpload(editingMailGroup.id, files)}
            onRemoveDocument={(docId) => handleRemoveGroupDocument(editingMailGroup.id, docId)}
            onUpdateOrganization={handleOrganizationUpdate}
            onSwapParticipants={() => handleSwapParticipants(editingMailGroup.id)}
          />
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <button 
            onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={wizardStep === 1}
          >
            Previous
          </button>
          <button 
            onClick={() => {
              if (wizardStep === 1 && jobData.senderEnterprises.length === 0) {
                alert('Please select at least one sender enterprise before continuing.');
                return;
              }
              if (wizardStep === 2) {
                if (mailGroups.length === 0) {
                  alert('Please add at least one mail group before proceeding.');
                  return;
                }
                const missingDocuments = mailGroups.filter(group => !group.documents || group.documents.length === 0);
                if (missingDocuments.length) {
                  alert('Each mail group needs at least one document before you continue.');
                  return;
                }
                const missingRecipientAddress = mailGroups.filter(group => !group.address);
                if (missingRecipientAddress.length) {
                  alert('Please provide a recipient address for every mail group.');
                  return;
                }
              }
              if (wizardStep === 3 && mailGroups.length === 0) {
                alert('No mail groups available to validate.');
                return;
              }
              if (wizardStep === steps.length) {
                alert('Mail job dispatched successfully!');
                setCurrentView('dashboard');
                setWizardStep(1);
                return;
              }
              setWizardStep(Math.min(steps.length, wizardStep + 1));
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
    
    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => setCurrentView('dashboard')}
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
                  if (!selectedJob) return;
                  const csvContent = `Job ID,Job Name,Recipient,Address,Tracking Number,Status,Delivery Date\n` +
                    recipients.map(r => 
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
                disabled={!selectedJob}
                className={`px-4 py-2 border border-gray-300 rounded-md flex items-center ${selectedJob ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
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
                    <Building className="w-4 h-4 mr-1" />
                    {selectedJob.jurisdiction}
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
                {recipients.map((recipient) => (
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
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-sm font-medium ${currentView === 'dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Dashboard
                </button>
                <button 
                  onClick={() => setCurrentView('wizard')}
                  className={`text-sm font-medium ${currentView === 'wizard' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Send Mail
                </button>
                <button 
                  onClick={() => {
                    if (sampleJobs.length > 0) {
                      setSelectedJob(sampleJobs[0]);
                      setCurrentView('tracking');
                    } else {
                      alert('No jobs available to track yet. Create a job first.');
                    }
                  }}
                  className={`text-sm font-medium ${currentView === 'tracking' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Track Mail
                </button>
                <button 
                  onClick={() => setCurrentView('archive')}
                  className={`text-sm font-medium ${currentView === 'archive' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Archive
                </button>
                <button 
                  onClick={() => setCurrentView('reports')}
                  className={`text-sm font-medium ${currentView === 'reports' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
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

      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'wizard' && <MailJobWizard />}
      {currentView === 'tracking' && <TrackingView />}
      {currentView === 'archive' && <ArchiveView />}
      {currentView === 'reports' && <ReportsView />}
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
            const defaultEnterpriseId = jobData.senderEnterprises[0] || enterprises[0]?.id || null;
            const enterpriseDetails = enterprises.find(ent => ent.id === defaultEnterpriseId);
            const normalizedDocs = (data.documents || []).map((doc, index) => ({
              id: doc.id || `${mailId}-DOC-${index}`,
              name: doc.name,
              pages: doc.pages || Math.floor(Math.random() * 120) + 30,
              size: doc.size || 'Unknown'
            }));

            const selectedOrg = data.organizationId
              ? organizations.find(org => org.id === data.organizationId) || null
              : null;
            const senderParticipant: ParticipantRecord = {
              enterpriseId: defaultEnterpriseId,
              organizationId: selectedOrg?.id || null,
              organizationName: selectedOrg?.name || enterpriseDetails?.name || '',
              contactName: enterpriseDetails?.contact || '',
              email: enterpriseDetails?.email || '',
              phone: enterpriseDetails?.phone || '',
              addressId: null,
              address: null
            };
            const recipientParticipant: ParticipantRecord = {
              enterpriseId: defaultEnterpriseId,
              organizationId: selectedOrg?.id || null,
              organizationName: selectedOrg?.name || data.recipientName || '',
              contactName: data.recipientName,
              email: data.email || '',
              phone: data.phone || '',
              addressId: null,
              address: data.address
                ? normalizeStructuredAddress({ streetAddress: data.address })
                : null
            };

            const quickGroup = {
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
              const existing = new Set(prev.map(file => file.name));
              const additions = normalizedDocs.filter(doc => !existing.has(doc.name));
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

export default OutboundMailSystem;
