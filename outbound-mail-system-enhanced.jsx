import React, { useState, useEffect } from 'react';
import { 
  Package, Upload, CheckCircle, AlertCircle, Search, Plus, 
  FileText, MapPin, Clock, TrendingUp, Users, Archive,
  ChevronRight, ChevronDown, Calendar, Filter, Download,
  Send, Eye, Edit, Trash2, RefreshCw, Check, X, AlertTriangle,
  Truck, Mail, Building, Phone, AtSign, Hash, User
} from 'lucide-react';

const OutboundMailSystem = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState(null);
  const [showImportCSV, setShowImportCSV] = useState(false);
  const [showQuickMail, setShowQuickMail] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([
    { id: 1, name: 'TAX-RETURN-2024-Q4-BATCH1.pdf', pages: 125, size: '2.3 MB' },
    { id: 2, name: 'TAX-RETURN-2024-Q4-BATCH2.pdf', pages: 98, size: '1.8 MB' },
    { id: 3, name: 'TAX-RETURN-2024-Q4-BATCH3.pdf', pages: 156, size: '3.1 MB' }
  ]);
  const [addressExceptions, setAddressExceptions] = useState([]);
  const [showFixAddress, setShowFixAddress] = useState(false);
  const [addressToFix, setAddressToFix] = useState(null);
  const [validationProgress, setValidationProgress] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  
  // Organizations with pre-saved addresses
  const [organizations] = useState([
    {
      id: 'ORG-001',
      name: 'Johnson Holdings LLC',
      addresses: [
        { id: 'ADDR-001', label: 'Headquarters', address: '123 Business Park Dr, Suite 200, Los Angeles, CA 90025', default: true },
        { id: 'ADDR-002', label: 'Warehouse', address: '456 Industrial Blvd, Los Angeles, CA 90026' },
        { id: 'ADDR-003', label: 'Billing Dept', address: '789 Financial Center, Suite 500, Los Angeles, CA 90027' }
      ]
    },
    {
      id: 'ORG-002',
      name: 'Smith Manufacturing Co.',
      addresses: [
        { id: 'ADDR-004', label: 'Main Office', address: '456 Industrial Way, San Francisco, CA 94105', default: true },
        { id: 'ADDR-005', label: 'Plant A', address: '321 Factory Ln, Oakland, CA 94601' }
      ]
    },
    {
      id: 'ORG-003',
      name: 'Davis Enterprises',
      addresses: [
        { id: 'ADDR-006', label: 'Corporate Office', address: '789 Commerce St, Suite 100, Sacramento, CA 95814', default: true }
      ]
    },
    {
      id: 'ORG-004',
      name: 'Anderson Corp',
      addresses: [
        { id: 'ADDR-007', label: 'HQ', address: '321 Market St, Suite 100, San Diego, CA 92101', default: true },
        { id: 'ADDR-008', label: 'Operations', address: '654 Operations Way, San Diego, CA 92102' }
      ]
    },
    {
      id: 'ORG-005',
      name: 'Baker Industries',
      addresses: [
        { id: 'ADDR-009', label: 'Main', address: '654 Innovation Blvd, Irvine, CA 92618', default: true }
      ]
    }
  ]);
  
  // Existing recipients in the system
  const [existingRecipients] = useState([
    { id: 'RCPT-001', name: 'John Smith', organization: 'Johnson Holdings LLC', email: 'john.smith@johnsonholdings.com' },
    { id: 'RCPT-002', name: 'Sarah Johnson', organization: 'Smith Manufacturing Co.', email: 'sarah.j@smithmfg.com' },
    { id: 'RCPT-003', name: 'Michael Davis', organization: 'Davis Enterprises', email: 'mdavis@davisent.com' },
    { id: 'RCPT-004', name: 'Emily Anderson', organization: 'Anderson Corp', email: 'emily@andersoncorp.com' },
    { id: 'RCPT-005', name: 'Robert Baker', organization: 'Baker Industries', email: 'rbaker@bakerindustries.com' },
    { id: 'RCPT-006', name: 'Lisa Chen', organization: 'Johnson Holdings LLC', email: 'lisa.chen@johnsonholdings.com' },
    { id: 'RCPT-007', name: 'David Wilson', organization: 'Smith Manufacturing Co.', email: 'dwilson@smithmfg.com' }
  ]);
  
  const [recipients, setRecipients] = useState([
    {
      id: 'REC-001',
      name: 'Johnson Holdings LLC',
      recipientName: 'John Smith',
      organizationId: 'ORG-001',
      address: '123 Business Park Dr, Suite 200, Los Angeles, CA 90025',
      trackingNumber: '9400111899562123456789',
      status: 'delivered',
      deliveredDate: '2025-01-17 14:32',
      documents: ['TAX-RETURN-2024-Q4-BATCH1.pdf', 'TAX-RETURN-2024-Q4-BATCH2.pdf'],
      deliveryType: 'Certified Mail',
      email: 'contact@johnsonholdings.com',
      phone: '(555) 123-4567'
    },
    {
      id: 'REC-002',
      name: 'Smith Manufacturing Co.',
      recipientName: 'Sarah Johnson',
      organizationId: 'ORG-002',
      address: '456 Industrial Way, San Francisco, CA 94105',
      trackingNumber: '9400111899562123456790',
      status: 'in-transit',
      deliveredDate: null,
      documents: ['TAX-RETURN-2024-Q4-BATCH2.pdf'],
      deliveryType: 'First Class',
      email: 'admin@smithmfg.com',
      phone: '(555) 234-5678'
    },
    {
      id: 'REC-003',
      name: 'Davis Enterprises',
      recipientName: 'Michael Davis',
      organizationId: 'ORG-003',
      address: '789 Commerce St, Sacramento, CA 95814',
      trackingNumber: '9400111899562123456791',
      status: 'exception',
      deliveredDate: null,
      documents: ['TAX-RETURN-2024-Q4-BATCH3.pdf'],
      exceptionReason: 'Address validation failed - Suite number missing',
      deliveryType: 'Priority',
      email: 'info@davisent.com',
      phone: '(555) 345-6789'
    }
  ]);
  const [jobData, setJobData] = useState({
    jobName: '',
    jurisdiction: '',
    dueDate: '',
    priority: 'standard',
    documents: [],
    recipients: []
  });

  // Handler functions
  const handleAddRecipient = (newRecipient) => {
    const recipientId = `REC-${String(recipients.length + 1).padStart(3, '0')}`;
    setRecipients([...recipients, {
      ...newRecipient,
      id: recipientId,
      trackingNumber: null,
      status: 'pending',
      deliveredDate: null
    }]);
    setShowAddRecipient(false);
  };

  const handleEditRecipient = (updatedRecipient) => {
    setRecipients(recipients.map(r => 
      r.id === updatedRecipient.id ? updatedRecipient : r
    ));
    setEditingRecipient(null);
  };

  const handleDeleteRecipient = (recipientId) => {
    if (window.confirm('Are you sure you want to delete this recipient?')) {
      setRecipients(recipients.filter(r => r.id !== recipientId));
    }
  };

  const handleFileUpload = (event) => {
    const files = event.target.files;
    const newFiles = Array.from(files).map((file, index) => ({
      id: uploadedFiles.length + index + 1,
      name: file.name,
      pages: Math.floor(Math.random() * 200) + 50,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
    }));
    setUploadedFiles([...uploadedFiles, ...newFiles]);
  };

  const handleDeleteFile = (fileId) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      setUploadedFiles(uploadedFiles.filter(f => f.id !== fileId));
    }
  };

  const handleImportCSV = () => {
    // Sample data to simulate CSV import
    const csvRecipients = [
      {
        name: 'Anderson Corp',
        address: '321 Market St, Suite 100, San Diego, CA 92101',
        email: 'billing@andersoncorp.com',
        phone: '(555) 456-7890',
        documents: ['TAX-RETURN-2024-Q4-BATCH1.pdf'],
        deliveryType: 'Certified Mail'
      },
      {
        name: 'Baker Industries',
        address: '654 Innovation Blvd, Irvine, CA 92618',
        email: 'accounts@bakerindustries.com',
        phone: '(555) 567-8901',
        documents: ['TAX-RETURN-2024-Q4-BATCH2.pdf'],
        deliveryType: 'First Class'
      },
      {
        name: 'Carter Logistics',
        address: '987 Distribution Way, Long Beach, CA 90802',
        email: 'finance@carterlogistics.com',
        phone: '(555) 678-9012',
        documents: ['TAX-RETURN-2024-Q4-BATCH3.pdf'],
        deliveryType: 'Priority'
      }
    ];
    
    const newRecipients = csvRecipients.map((recipient, index) => ({
      ...recipient,
      id: `REC-${String(recipients.length + index + 1).padStart(3, '0')}`,
      trackingNumber: null,
      status: 'pending',
      deliveredDate: null
    }));
    
    setRecipients([...recipients, ...newRecipients]);
    setShowImportCSV(false);
    alert('Successfully imported 3 recipients from CSV!');
  };

  const handleValidateAddresses = () => {
    setIsValidating(true);
    setValidationProgress(0);
    
    // Simulate validation progress
    const interval = setInterval(() => {
      setValidationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsValidating(false);
          
          // Generate some exceptions
          const exceptions = recipients
            .filter((r, index) => index % 10 === 0) // Every 10th recipient has an issue
            .map(r => ({
              ...r,
              issue: 'Suite number missing - Business address requires suite/unit number',
              suggestedFix: r.address + ', Suite 100'
            }));
          
          setAddressExceptions(exceptions);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFixAddress = (recipientId, newAddress) => {
    setRecipients(recipients.map(r => 
      r.id === recipientId ? { ...r, address: newAddress, status: 'valid' } : r
    ));
    setAddressExceptions(addressExceptions.filter(e => e.id !== recipientId));
    setShowFixAddress(false);
    setAddressToFix(null);
  };

  const handleSkipException = (recipientId) => {
    setAddressExceptions(addressExceptions.filter(e => e.id !== recipientId));
  };

  // Sample data
  const sampleJobs = [
    { 
      id: 'JOB-001', 
      name: 'Q4 Tax Returns - California', 
      jurisdiction: 'CA', 
      status: 'delivered',
      sentDate: '2025-01-15', 
      items: 245, 
      delivered: 238, 
      inTransit: 5, 
      exceptions: 2,
      priority: 'high'
    },
    { 
      id: 'JOB-002', 
      name: 'Annual Filings - New York', 
      jurisdiction: 'NY', 
      status: 'in-transit',
      sentDate: '2025-01-18', 
      items: 182, 
      delivered: 45, 
      inTransit: 130, 
      exceptions: 7,
      priority: 'standard'
    },
    { 
      id: 'JOB-003', 
      name: 'Property Tax Notices - Texas', 
      jurisdiction: 'TX', 
      status: 'pending-approval',
      sentDate: null, 
      items: 320, 
      delivered: 0, 
      inTransit: 0, 
      exceptions: 0,
      priority: 'standard'
    },
    { 
      id: 'JOB-004', 
      name: 'Business License Renewals - Florida', 
      jurisdiction: 'FL', 
      status: 'draft',
      sentDate: null, 
      items: 89, 
      delivered: 0, 
      inTransit: 0, 
      exceptions: 0,
      priority: 'low'
    }
  ];

  const trackingEvents = [
    { timestamp: '2025-01-15 09:00', event: 'Label Created', location: 'Los Angeles, CA' },
    { timestamp: '2025-01-15 11:30', event: 'Picked Up', location: 'Los Angeles, CA' },
    { timestamp: '2025-01-15 16:45', event: 'In Transit', location: 'Distribution Center' },
    { timestamp: '2025-01-16 08:20', event: 'Out for Delivery', location: 'Local Post Office' },
    { timestamp: '2025-01-17 14:32', event: 'Delivered', location: 'Recipient Address', signature: 'J. SMITH' }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      'delivered': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'in-transit': { color: 'bg-blue-100 text-blue-800', icon: Truck },
      'pending-approval': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'draft': { color: 'bg-gray-100 text-gray-800', icon: FileText },
      'exception': { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      'pending': { color: 'bg-gray-100 text-gray-800', icon: Clock }
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
          address: defaultAddr?.address || '',
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
          address: defaultAddr?.address || ''
        });
        setSelectedAddress(defaultAddr);
      }
    };
    
    const handleAddressSelect = (address) => {
      setSelectedAddress(address);
      setFormData({
        ...formData,
        address: address.address
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
                        {addr.label} - {addr.address}
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
          address: defaultAddr?.address || '',
          email: recipient.email
        });
      }
      setSearchRecipient(recipient.name);
      setShowRecipientDropdown(false);
    };
    
    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        setUploadedDoc({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        });
        setQuickMailData({
          ...quickMailData,
          documents: [file.name]
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
                      <p className="text-xs text-gray-500">{uploadedDoc.size}</p>
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
                        setQuickMailData({...quickMailData, address: addr.address});
                      }
                    }}
                  >
                    <option value="">Choose address...</option>
                    {selectedOrg.addresses.map(addr => (
                      <option key={addr.id} value={addr.id}>
                        {addr.label} - {addr.address}
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
                rows="2"
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
              <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">1,847</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">342</p>
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
              <p className="text-2xl font-bold text-gray-900 mt-1">23</p>
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
              setSelectedJob(sampleJobs[0]);
              setCurrentView('tracking');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
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

  const ArchiveView = () => (
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
              placeholder="Job ID, recipient, tracking..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jurisdiction</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Jurisdictions</option>
              <option>California</option>
              <option>New York</option>
              <option>Texas</option>
              <option>Florida</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>Delivered</option>
              <option>In Transit</option>
              <option>Exception</option>
              <option>Returned</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end space-x-3">
          <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
            Clear Filters
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <Search className="w-4 h-4 mr-2" />
            Search Archive
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Archived Mail Jobs</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Search for archived mail jobs using the filters above</p>
            <p className="text-sm text-gray-500 mt-2">Archive contains 2,847 historical mail jobs</p>
          </div>
        </div>
      </div>
    </div>
  );
  
  const ReportsView = () => (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Generate detailed reports and performance metrics</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <TrendingUp className="w-8 h-8 text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Performance</h3>
          <p className="text-sm text-gray-600">On-time delivery rates, average transit times, and carrier performance</p>
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
            Generate Report →
          </button>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <Building className="w-8 h-8 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Jurisdiction Summary</h3>
          <p className="text-sm text-gray-600">Mail volumes, costs, and compliance metrics by jurisdiction</p>
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
            Generate Report →
          </button>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <AlertCircle className="w-8 h-8 text-red-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Exception Analysis</h3>
          <p className="text-sm text-gray-600">Address validation failures, returned mail, and resolution times</p>
          <button className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
            Generate Report →
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Quick Stats - Last 30 Days</h2>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            Export All Data
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Total Mail Sent</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">8,247</p>
              <p className="text-xs text-green-600 mt-1">↑ 12% from last month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Delivery Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">98.3%</p>
              <p className="text-xs text-green-600 mt-1">↑ 0.5% from last month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg. Delivery Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">3.2 days</p>
              <p className="text-xs text-green-600 mt-1">↓ 0.3 days from last month</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">$42,847</p>
              <p className="text-xs text-red-600 mt-1">↑ 8% from last month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const MailJobWizard = () => {
    const steps = [
      { number: 1, name: 'Job Details', icon: FileText },
      { number: 2, name: 'Upload Documents', icon: Upload },
      { number: 3, name: 'Map Recipients', icon: Users },
      { number: 4, name: 'Validate', icon: CheckCircle },
      { number: 5, name: 'Preview', icon: Eye },
      { number: 6, name: 'Approve', icon: Check },
      { number: 7, name: 'Dispatch', icon: Send }
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
                  Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Add any special instructions or notes..."
                />
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop PDF files here, or click to browse</p>
                <input
                  type="file"
                  id="fileUpload"
                  multiple
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <label
                  htmlFor="fileUpload"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer"
                >
                  Select Files
                </label>
                <p className="text-xs text-gray-500 mt-2">Supports: PDF files up to 100MB each</p>
              </div>
              
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Uploaded Files ({uploadedFiles.length})</h3>
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                            <p className="text-xs text-gray-500">{file.pages} pages, {file.size}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteFile(file.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {uploadedFiles.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">No files uploaded</p>
                      <p className="text-sm text-yellow-700 mt-1">Please upload at least one PDF document to continue</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Map Recipients</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setShowImportCSV(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import CSV
                  </button>
                  <button 
                    onClick={() => setShowAddRecipient(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Recipient
                  </button>
                </div>
              </div>
              
              {recipients.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No recipients added yet</p>
                  <p className="text-sm text-gray-500 mb-4">Add recipients manually or import from a CSV file</p>
                  <div className="flex justify-center space-x-3">
                    <button 
                      onClick={() => setShowAddRecipient(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Add First Recipient
                    </button>
                    <button 
                      onClick={() => setShowImportCSV(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Import from CSV
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validation</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recipients.map((recipient) => (
                        <tr key={recipient.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">{recipient.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <div>
                              <p>{recipient.address}</p>
                              {recipient.email && (
                                <p className="text-xs text-gray-400 mt-1">{recipient.email}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {recipient.documents && recipient.documents.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {recipient.documents.map((doc, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                    <FileText className="w-3 h-3 mr-1" />
                                    {doc.substring(0, 20)}...
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No documents</span>
                            )}
                            <button
                              onClick={() => setEditingRecipient(recipient)}
                              className="text-xs text-blue-600 hover:text-blue-800 mt-1 block"
                            >
                              Edit Documents
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <select 
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                              value={recipient.deliveryType}
                              onChange={(e) => {
                                const updated = {...recipient, deliveryType: e.target.value};
                                handleEditRecipient(updated);
                              }}
                            >
                              <option>Certified Mail</option>
                              <option>First Class</option>
                              <option>Priority</option>
                              <option>Express</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {recipient.status === 'exception' ? (
                              <span className="inline-flex items-center text-red-600">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                <span className="text-xs">Invalid</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-green-600">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                <span className="text-xs">Valid</span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => setEditingRecipient(recipient)}
                              className="text-blue-600 hover:text-blue-800 mr-2"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRecipient(recipient.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {recipients.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Total Recipients: {recipients.length}</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Ready for validation: {recipients.filter(r => r.status !== 'exception').length} | 
                        Exceptions: {recipients.filter(r => r.status === 'exception').length}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Simulate validation
                        const validatedRecipients = recipients.map(r => ({
                          ...r,
                          status: Math.random() > 0.9 ? 'exception' : 'valid'
                        }));
                        setRecipients(validatedRecipients);
                      }}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Validate All
                    </button>
                  </div>
                </div>
              )}
              
              {/* Modals */}
              {showAddRecipient && (
                <RecipientModal 
                  recipient={null}
                  onSave={handleAddRecipient}
                  onClose={() => setShowAddRecipient(false)}
                />
              )}
              
              {editingRecipient && (
                <RecipientModal 
                  recipient={editingRecipient}
                  onSave={handleEditRecipient}
                  onClose={() => setEditingRecipient(null)}
                />
              )}
              
              {showImportCSV && (
                <CSVImportModal 
                  onImport={handleImportCSV}
                  onClose={() => setShowImportCSV(false)}
                />
              )}
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Validate Addresses</h2>
              
              {!isValidating && validationProgress === 0 && (
                <button
                  onClick={handleValidateAddresses}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Start Address Validation
                </button>
              )}
              
              {isValidating && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5 mr-3 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Validating Addresses...</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Checking {recipients.length} addresses with USPS Address Validation API
                      </p>
                      <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{width: `${validationProgress}%`}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {validationProgress === 100 && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-900 font-medium">Valid</span>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {recipients.length - Math.ceil(recipients.length / 10) - 5}
                      </p>
                      <p className="text-sm text-green-700">Ready to send</p>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-yellow-900 font-medium">Corrected</span>
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">5</p>
                      <p className="text-sm text-yellow-700">Auto-corrected</p>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-red-900 font-medium">Exceptions</span>
                        <X className="w-5 h-5 text-red-600" />
                      </div>
                      <p className="text-2xl font-bold text-red-900">{addressExceptions.length}</p>
                      <p className="text-sm text-red-700">Need review</p>
                    </div>
                  </div>
                  
                  {addressExceptions.length > 0 && (
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
                  )}
                  
                  {addressExceptions.length === 0 && (
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

          {wizardStep === 5 && (
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
                        <p className="text-xs text-gray-500 mt-1">TAX-RETURN-2024-Q4.pdf</p>
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
                        <dd className="font-medium">245</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Delivery Method:</dt>
                        <dd className="font-medium">Certified Mail</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Estimated Cost:</dt>
                        <dd className="font-medium">$2,847.50</dd>
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

          {wizardStep === 6 && (
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
                    <dd className="mt-1 text-sm text-gray-900">Q4 Tax Returns - California</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Jurisdiction</dt>
                    <dd className="mt-1 text-sm text-gray-900">California (CA)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Priority</dt>
                    <dd className="mt-1 text-sm text-gray-900">High</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">January 31, 2025</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Recipients</dt>
                    <dd className="mt-1 text-sm text-gray-900">245</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Total Cost</dt>
                    <dd className="mt-1 text-sm text-gray-900">$2,847.50</dd>
                  </div>
                </dl>
                
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval Comments
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
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

          {wizardStep === 7 && (
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
                      <li>• 245 mail pieces ready</li>
                      <li>• Tracking numbers will be assigned</li>
                      <li>• Estimated delivery: 3-5 days</li>
                      <li>• Proof of mailing will be generated</li>
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
              if (wizardStep === 2 && uploadedFiles.length === 0) {
                alert('Please upload at least one document before proceeding');
                return;
              }
              if (wizardStep === 3 && recipients.length === 0) {
                alert('Please add at least one recipient before proceeding');
                return;
              }
              if (wizardStep === 7) {
                alert('Mail job dispatched successfully!');
                setCurrentView('dashboard');
                setWizardStep(1);
                return;
              }
              setWizardStep(Math.min(7, wizardStep + 1));
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {wizardStep === 7 ? 'Complete' : 'Next'}
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
                  const csvContent = `Job ID,Job Name,Recipient,Address,Tracking Number,Status,Delivery Date\n` +
                    recipients.map(r => 
                      `${selectedJob.id},${selectedJob.name},"${r.name}","${r.address}",${r.trackingNumber},${r.status},${r.deliveredDate || 'Pending'}`
                    ).join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `mail-tracking-${selectedJob.id}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
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
                        <td colSpan="6" className="px-6 py-4 bg-gray-50">
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
                                {trackingEvents.map((event, index) => (
                                  <div key={index} className="flex items-start space-x-3">
                                    <div className="mt-0.5">
                                      {index === trackingEvents.length - 1 ? (
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
                    setSelectedJob(sampleJobs[0]);
                    setCurrentView('tracking');
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
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'wizard' && <MailJobWizard />}
      {currentView === 'tracking' && <TrackingView />}
      {currentView === 'archive' && <ArchiveView />}
      {currentView === 'reports' && <ReportsView />}
      
      {/* Quick Mail Modal */}
      {showQuickMail && (
        <QuickMailModal 
          onClose={() => setShowQuickMail(false)}
          onSend={(data) => {
            // Add the quick mail to recipients
            const newRecipient = {
              id: `REC-${String(recipients.length + 1).padStart(3, '0')}`,
              name: data.recipientName,
              recipientName: data.recipientName,
              organizationId: data.organizationId,
              address: data.address,
              trackingNumber: null,
              status: 'pending',
              deliveredDate: null,
              documents: data.documents,
              deliveryType: data.deliveryType,
              email: data.email,
              phone: data.phone
            };
            setRecipients([...recipients, newRecipient]);
            setShowQuickMail(false);
          }}
        />
      )}
    </div>
  );
};

export default OutboundMailSystem;