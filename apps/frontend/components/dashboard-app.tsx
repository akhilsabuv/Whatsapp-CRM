"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import clsx from "clsx";
import { BrandMark } from "./brand-mark";
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Columns3,
  Download,
  GanttChartSquare,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Maximize2,
  MessageCircleMore,
  Minimize2,
  Phone,
  Plus,
  Radar,
  Search,
  SendHorizontal,
  Settings2,
  Shield,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";

type Role = "ADMIN" | "USER";

type DepartmentAssignment = {
  id: number;
  departmentId: number;
  positionId: number;
  department: {
    id: number;
    name: string;
  };
  position: {
    id: number;
    title: string;
  };
};

type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  profileImageUrl?: string | null;
  role: Role;
  whatsappConnected: boolean;
  needsReauth: boolean;
  timeZone: string;
  currency: string;
  language: string;
  briefingTime: string;
  firstReminderMinutes: number;
  secondReminderMinutes: number;
  departmentAssignments?: DepartmentAssignment[];
  createdAt?: string;
  updatedAt?: string;
};

type OrganizationDepartment = {
  id: number;
  name: string;
  positions: Array<{
    id: number;
    title: string;
  }>;
};

type Action = {
  id: number;
  leadId: number;
  assignedToId: number;
  title: string;
  notes: string | null;
  scheduledAt: string;
  isDone: boolean;
  outcomeStatus: string;
  completedAt?: string | null;
  nextActionTitle?: string | null;
  nextActionNotes?: string | null;
  nextActionScheduledAt?: string | null;
};

type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

type ProjectMemberRole = "ADMIN" | "PROJECT_OWNER" | "MEMBER" | "VIEWER";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type TaskLabel = {
  id: number;
  projectId: number;
  name: string;
  color?: string | null;
};

type ProjectMember = {
  id: number;
  userId: number;
  role: ProjectMemberRole;
  user: Pick<User, "id" | "name" | "email">;
};

type TaskComment = {
  id: number;
  taskId: number;
  authorId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, "id" | "name" | "email">;
};

type TaskActivity = {
  id: number;
  projectId: number;
  taskId?: number | null;
  actorUserId?: number | null;
  action: string;
  field?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  message: string;
  metadataJson?: string | null;
  createdAt: string;
  actor?: Pick<User, "id" | "name" | "email"> | null;
};

type Task = {
  id: number;
  projectId: number;
  parentTaskId?: number | null;
  leadId?: number | null;
  customerId?: number | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: number | null;
  reporterId: number;
  dueDate?: string | null;
  dueSoonNotifiedAt?: string | null;
  overdueNotifiedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  sortOrder: number;
  overdue?: boolean;
  assignee?: Pick<User, "id" | "name" | "email"> | null;
  reporter?: Pick<User, "id" | "name" | "email"> | null;
  labels?: TaskLabel[];
  comments?: TaskComment[];
  activities?: TaskActivity[];
  subtasks?: Array<{
    id: number;
    title: string;
    status: TaskStatus;
    assigneeId?: number | null;
    dueDate?: string | null;
  }>;
  _count?: {
    comments: number;
    subtasks: number;
  };
};

type Project = {
  id: number;
  title: string;
  key?: string | null;
  description?: string | null;
  notes?: string | null;
  status: ProjectStatus | string;
  ownerId?: number;
  leadId?: number | null;
  customerId?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  progress?: number;
  overdueTaskCount?: number;
  owner?: Pick<User, "id" | "name" | "email">;
  members?: ProjectMember[];
  labels?: TaskLabel[];
  tasks?: Task[];
  activities?: TaskActivity[];
  createdAt: string;
  updatedAt?: string;
};

type Lead = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  status: "LEAD" | "CUSTOMER";
  pipelineStage: string;
  sourceCreatedTime?: string | null;
  externalLeadId?: string | null;
  adId?: string | null;
  adName?: string | null;
  adsetId?: string | null;
  adsetName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  formId?: string | null;
  formName?: string | null;
  fullName?: string | null;
  city?: string | null;
  budget?: string | null;
  preferredLocation?: string | null;
  customDisclaimerResponses?: string | null;
  isOrganic?: boolean | null;
  platform?: string | null;
  assignedToId: number;
  assignedTo?: Pick<User, "id" | "email" | "role">;
  actions?: Action[];
  projects?: Project[];
  messages?: Message[];
  transfers?: Transfer[];
};

type Transfer = {
  id: number;
  leadId: number;
  fromUserId: number;
  toUserId: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt?: string;
  lead: Lead;
  fromUser: { id: number; email: string };
  toUser: { id: number; email: string };
};

type Message = {
  id: number;
  content: string;
  sentAt: string;
};

type TeamChatMessage = {
  id: number;
  senderUserId: number;
  recipientUserId: number;
  content: string;
  createdAt: string;
};

type CronJobLog = {
  id: number;
  jobType: string;
  action: string;
  status: string;
  details?: string | null;
  scheduledFor?: string | null;
  executedAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
};

type DashboardPayload = {
  todayActions: Array<Action & { lead: Lead }>;
  todayProjectTasks: Array<Task & { project: { title: string } }>;
  recentTransfers: Transfer[];
  metrics: {
    totalLeads: number;
    customers: number;
    pendingTransfers: number;
    dueToday: number;
  };
  morningBrief: {
    generatedAtUtc: string;
    message: string;
  };
};

type LeadEditForm = {
  name: string;
  fullName: string;
  phoneCountryCode: string;
  phone: string;
  email: string;
  status: "LEAD" | "CUSTOMER";
  pipelineStage: string;
  assignedToId: string;
  sourceCreatedTime: string;
  externalLeadId: string;
  adId: string;
  adName: string;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  formId: string;
  formName: string;
  city: string;
  budget: string;
  preferredLocation: string;
  customDisclaimerResponses: string;
  isOrganic: string;
  platform: string;
};

type ActionFollowUpForm = {
  outcomeStatus: Action["outcomeStatus"];
  nextActionTitle: string;
  nextActionNotes: string;
  nextActionScheduledAt: string;
};

type LeadFormState = LeadEditForm;

type SettingsFormState = {
  timeZone: string;
  currency: string;
  language: string;
  briefingTime: string;
  firstReminderMinutes: number;
  secondReminderMinutes: number;
};

type SmtpSettingsState = {
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
};

type TeamEditFormState = {
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  profileImageUrl: string;
  role: Role;
  timeZone: string;
  currency: string;
  briefingTime: string;
  firstReminderMinutes: number;
  secondReminderMinutes: number;
  assignments: Array<{
    departmentName: string;
    positionTitle: string;
  }>;
};

type DepartmentSettingsFormState = Array<{
  name: string;
  positions: string[];
}>;

type KanbanStage = {
  id: string;
  title: string;
};

type ActionFollowUpOption = {
  id: string;
  title: string;
};

type WorkspaceTab =
  | "DASHBOARD"
  | "LEADS"
  | "CUSTOMERS"
  | "TEAMS"
  | "CRON_JOBS"
  | "PROJECTS"
  | "SETTINGS";

type RouteState = {
  tab: WorkspaceTab;
  leadId: number | null;
  teamId: number | null;
  projectId: number | null;
  taskId: number | null;
  transfersOpen: boolean;
};

const LIST_PAGE_SIZE = 10;
const DASHBOARD_NEW_PAGE_SIZE = 3;

const DEFAULT_KANBAN_COLUMNS: KanbanStage[] = [
  { id: "NEW", title: "New" },
  { id: "COLD", title: "Cold" },
  { id: "WARM", title: "Warm" },
  { id: "HOT", title: "Hot" },
  { id: "DEAD", title: "Dead" },
  { id: "CUSTOMER", title: "Customer" },
];

const DEFAULT_ACTION_FOLLOW_UP_OPTIONS: ActionFollowUpOption[] = [
  { id: "COMPLETED", title: "Completed" },
  { id: "INCOMPLETE", title: "Incomplete" },
  { id: "CLIENT_BUSY", title: "Client Was Busy" },
  { id: "NO_RESPONSE", title: "Client Didn't Respond" },
  { id: "CALL_BACK_ANOTHER_DAY", title: "Ask to Call Back Another Day" },
  { id: "EMAIL_SENT", title: "Send an Email" },
];

const REQUIRED_KANBAN_STAGE_IDS = ["NEW", "COLD", "WARM", "HOT", "DEAD", "CUSTOMER"] as const;
const PROJECT_STATUS_OPTIONS: Array<{ label: string; value: ProjectStatus }> = [
  { label: "Planning", value: "PLANNING" },
  { label: "Active", value: "ACTIVE" },
  { label: "On Hold", value: "ON_HOLD" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Archived", value: "ARCHIVED" },
];
const TASK_STATUS_OPTIONS: Array<{ label: string; value: TaskStatus }> = [
  { label: "To Do", value: "TODO" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Review", value: "REVIEW" },
  { label: "Done", value: "DONE" },
];
const TASK_PRIORITY_OPTIONS: Array<{ label: string; value: TaskPriority }> = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

const browserBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const TIME_ZONE_OPTIONS = [
  { label: "India Standard Time (Asia/Kolkata)", value: "Asia/Kolkata" },
  { label: "UTC", value: "UTC" },
  { label: "Dubai (Asia/Dubai)", value: "Asia/Dubai" },
  { label: "London (Europe/London)", value: "Europe/London" },
  { label: "New York (America/New_York)", value: "America/New_York" },
  { label: "Los Angeles (America/Los_Angeles)", value: "America/Los_Angeles" },
  { label: "Singapore (Asia/Singapore)", value: "Asia/Singapore" },
  { label: "Sydney (Australia/Sydney)", value: "Australia/Sydney" },
] as const;

const REMINDER_MINUTE_OPTIONS = [
  { label: "5 minutes", value: "5" },
  { label: "10 minutes", value: "10" },
  { label: "15 minutes", value: "15" },
  { label: "20 minutes", value: "20" },
  { label: "30 minutes", value: "30" },
  { label: "45 minutes", value: "45" },
  { label: "60 minutes", value: "60" },
  { label: "90 minutes", value: "90" },
  { label: "120 minutes", value: "120" },
] as const;

const CURRENCY_OPTIONS = [
  { label: "Afghan Afghani (AFN)", value: "AFN" },
  { label: "Albanian Lek (ALL)", value: "ALL" },
  { label: "Algerian Dinar (DZD)", value: "DZD" },
  { label: "Angolan Kwanza (AOA)", value: "AOA" },
  { label: "Argentine Peso (ARS)", value: "ARS" },
  { label: "Armenian Dram (AMD)", value: "AMD" },
  { label: "Aruban Florin (AWG)", value: "AWG" },
  { label: "Australian Dollar (AUD)", value: "AUD" },
  { label: "Azerbaijani Manat (AZN)", value: "AZN" },
  { label: "Bahamian Dollar (BSD)", value: "BSD" },
  { label: "Bahraini Dinar (BHD)", value: "BHD" },
  { label: "Bangladeshi Taka (BDT)", value: "BDT" },
  { label: "Barbadian Dollar (BBD)", value: "BBD" },
  { label: "Belarusian Ruble (BYN)", value: "BYN" },
  { label: "Belize Dollar (BZD)", value: "BZD" },
  { label: "Bermudian Dollar (BMD)", value: "BMD" },
  { label: "Bhutanese Ngultrum (BTN)", value: "BTN" },
  { label: "Bolivian Boliviano (BOB)", value: "BOB" },
  { label: "Bosnia and Herzegovina Convertible Mark (BAM)", value: "BAM" },
  { label: "Botswana Pula (BWP)", value: "BWP" },
  { label: "Brazilian Real (BRL)", value: "BRL" },
  { label: "Brunei Dollar (BND)", value: "BND" },
  { label: "Bulgarian Lev (BGN)", value: "BGN" },
  { label: "Burundian Franc (BIF)", value: "BIF" },
  { label: "Cambodian Riel (KHR)", value: "KHR" },
  { label: "Canadian Dollar (CAD)", value: "CAD" },
  { label: "Cape Verdean Escudo (CVE)", value: "CVE" },
  { label: "Cayman Islands Dollar (KYD)", value: "KYD" },
  { label: "Central African CFA Franc (XAF)", value: "XAF" },
  { label: "CFP Franc (XPF)", value: "XPF" },
  { label: "Chilean Peso (CLP)", value: "CLP" },
  { label: "Chinese Yuan (CNY)", value: "CNY" },
  { label: "Colombian Peso (COP)", value: "COP" },
  { label: "Comorian Franc (KMF)", value: "KMF" },
  { label: "Congolese Franc (CDF)", value: "CDF" },
  { label: "Costa Rican Colon (CRC)", value: "CRC" },
  { label: "Croatian Euro (EUR)", value: "EUR" },
  { label: "Cuban Peso (CUP)", value: "CUP" },
  { label: "Czech Koruna (CZK)", value: "CZK" },
  { label: "Danish Krone (DKK)", value: "DKK" },
  { label: "Djiboutian Franc (DJF)", value: "DJF" },
  { label: "Dominican Peso (DOP)", value: "DOP" },
  { label: "East Caribbean Dollar (XCD)", value: "XCD" },
  { label: "Egyptian Pound (EGP)", value: "EGP" },
  { label: "Eritrean Nakfa (ERN)", value: "ERN" },
  { label: "Ethiopian Birr (ETB)", value: "ETB" },
  { label: "Euro (EUR)", value: "EUR" },
  { label: "Falkland Islands Pound (FKP)", value: "FKP" },
  { label: "Fijian Dollar (FJD)", value: "FJD" },
  { label: "Gambian Dalasi (GMD)", value: "GMD" },
  { label: "Georgian Lari (GEL)", value: "GEL" },
  { label: "Ghanaian Cedi (GHS)", value: "GHS" },
  { label: "Gibraltar Pound (GIP)", value: "GIP" },
  { label: "Guatemalan Quetzal (GTQ)", value: "GTQ" },
  { label: "Guinean Franc (GNF)", value: "GNF" },
  { label: "Guyanese Dollar (GYD)", value: "GYD" },
  { label: "Haitian Gourde (HTG)", value: "HTG" },
  { label: "Honduran Lempira (HNL)", value: "HNL" },
  { label: "Hong Kong Dollar (HKD)", value: "HKD" },
  { label: "Hungarian Forint (HUF)", value: "HUF" },
  { label: "Icelandic Krona (ISK)", value: "ISK" },
  { label: "Indian Rupee (INR)", value: "INR" },
  { label: "Indonesian Rupiah (IDR)", value: "IDR" },
  { label: "Iranian Rial (IRR)", value: "IRR" },
  { label: "Iraqi Dinar (IQD)", value: "IQD" },
  { label: "Israeli New Shekel (ILS)", value: "ILS" },
  { label: "Jamaican Dollar (JMD)", value: "JMD" },
  { label: "Japanese Yen (JPY)", value: "JPY" },
  { label: "Jordanian Dinar (JOD)", value: "JOD" },
  { label: "Kazakhstani Tenge (KZT)", value: "KZT" },
  { label: "Kenyan Shilling (KES)", value: "KES" },
  { label: "Kuwaiti Dinar (KWD)", value: "KWD" },
  { label: "Kyrgyzstani Som (KGS)", value: "KGS" },
  { label: "Lao Kip (LAK)", value: "LAK" },
  { label: "Lebanese Pound (LBP)", value: "LBP" },
  { label: "Lesotho Loti (LSL)", value: "LSL" },
  { label: "Liberian Dollar (LRD)", value: "LRD" },
  { label: "Libyan Dinar (LYD)", value: "LYD" },
  { label: "Macanese Pataca (MOP)", value: "MOP" },
  { label: "Malagasy Ariary (MGA)", value: "MGA" },
  { label: "Malawian Kwacha (MWK)", value: "MWK" },
  { label: "Malaysian Ringgit (MYR)", value: "MYR" },
  { label: "Maldivian Rufiyaa (MVR)", value: "MVR" },
  { label: "Mauritanian Ouguiya (MRU)", value: "MRU" },
  { label: "Mauritian Rupee (MUR)", value: "MUR" },
  { label: "Mexican Peso (MXN)", value: "MXN" },
  { label: "Moldovan Leu (MDL)", value: "MDL" },
  { label: "Mongolian Tugrik (MNT)", value: "MNT" },
  { label: "Moroccan Dirham (MAD)", value: "MAD" },
  { label: "Mozambican Metical (MZN)", value: "MZN" },
  { label: "Myanmar Kyat (MMK)", value: "MMK" },
  { label: "Namibian Dollar (NAD)", value: "NAD" },
  { label: "Nepalese Rupee (NPR)", value: "NPR" },
  { label: "Netherlands Antillean Guilder (ANG)", value: "ANG" },
  { label: "New Taiwan Dollar (TWD)", value: "TWD" },
  { label: "New Zealand Dollar (NZD)", value: "NZD" },
  { label: "Nicaraguan Cordoba (NIO)", value: "NIO" },
  { label: "Nigerian Naira (NGN)", value: "NGN" },
  { label: "North Korean Won (KPW)", value: "KPW" },
  { label: "North Macedonian Denar (MKD)", value: "MKD" },
  { label: "Norwegian Krone (NOK)", value: "NOK" },
  { label: "Omani Rial (OMR)", value: "OMR" },
  { label: "Pakistani Rupee (PKR)", value: "PKR" },
  { label: "Panamanian Balboa (PAB)", value: "PAB" },
  { label: "Papua New Guinean Kina (PGK)", value: "PGK" },
  { label: "Paraguayan Guarani (PYG)", value: "PYG" },
  { label: "Peruvian Sol (PEN)", value: "PEN" },
  { label: "Philippine Peso (PHP)", value: "PHP" },
  { label: "Polish Zloty (PLN)", value: "PLN" },
  { label: "Qatari Riyal (QAR)", value: "QAR" },
  { label: "Romanian Leu (RON)", value: "RON" },
  { label: "Russian Ruble (RUB)", value: "RUB" },
  { label: "Rwandan Franc (RWF)", value: "RWF" },
  { label: "Saint Helena Pound (SHP)", value: "SHP" },
  { label: "Salvadoran Colon (SVC)", value: "SVC" },
  { label: "Samoan Tala (WST)", value: "WST" },
  { label: "Sao Tome and Principe Dobra (STN)", value: "STN" },
  { label: "Saudi Riyal (SAR)", value: "SAR" },
  { label: "Serbian Dinar (RSD)", value: "RSD" },
  { label: "Seychellois Rupee (SCR)", value: "SCR" },
  { label: "Sierra Leonean Leone (SLE)", value: "SLE" },
  { label: "Singapore Dollar (SGD)", value: "SGD" },
  { label: "Solomon Islands Dollar (SBD)", value: "SBD" },
  { label: "Somali Shilling (SOS)", value: "SOS" },
  { label: "South African Rand (ZAR)", value: "ZAR" },
  { label: "South Korean Won (KRW)", value: "KRW" },
  { label: "South Sudanese Pound (SSP)", value: "SSP" },
  { label: "Sri Lankan Rupee (LKR)", value: "LKR" },
  { label: "Sudanese Pound (SDG)", value: "SDG" },
  { label: "Surinamese Dollar (SRD)", value: "SRD" },
  { label: "Swazi Lilangeni (SZL)", value: "SZL" },
  { label: "Swedish Krona (SEK)", value: "SEK" },
  { label: "Swiss Franc (CHF)", value: "CHF" },
  { label: "Syrian Pound (SYP)", value: "SYP" },
  { label: "Tajikistani Somoni (TJS)", value: "TJS" },
  { label: "Tanzanian Shilling (TZS)", value: "TZS" },
  { label: "Thai Baht (THB)", value: "THB" },
  { label: "Tongan Paʻanga (TOP)", value: "TOP" },
  { label: "Trinidad and Tobago Dollar (TTD)", value: "TTD" },
  { label: "Tunisian Dinar (TND)", value: "TND" },
  { label: "Turkish Lira (TRY)", value: "TRY" },
  { label: "Turkmenistani Manat (TMT)", value: "TMT" },
  { label: "Ugandan Shilling (UGX)", value: "UGX" },
  { label: "Ukrainian Hryvnia (UAH)", value: "UAH" },
  { label: "United Arab Emirates Dirham (AED)", value: "AED" },
  { label: "United States Dollar (USD)", value: "USD" },
  { label: "Uruguayan Peso (UYU)", value: "UYU" },
  { label: "Uzbekistani Som (UZS)", value: "UZS" },
  { label: "Vanuatu Vatu (VUV)", value: "VUV" },
  { label: "Venezuelan Bolivar (VES)", value: "VES" },
  { label: "Vietnamese Dong (VND)", value: "VND" },
  { label: "West African CFA Franc (XOF)", value: "XOF" },
  { label: "Yemeni Rial (YER)", value: "YER" },
  { label: "Zambian Kwacha (ZMW)", value: "ZMW" },
  { label: "Zimbabwe Gold (ZWG)", value: "ZWG" },
] as const;

const COUNTRY_CODE_OPTIONS = [
  { label: "Afghanistan (+93)", value: "+93" },
  { label: "Albania (+355)", value: "+355" },
  { label: "Algeria (+213)", value: "+213" },
  { label: "Andorra (+376)", value: "+376" },
  { label: "Angola (+244)", value: "+244" },
  { label: "Antigua and Barbuda (+1-268)", value: "+1268" },
  { label: "Argentina (+54)", value: "+54" },
  { label: "Armenia (+374)", value: "+374" },
  { label: "Australia (+61)", value: "+61" },
  { label: "Austria (+43)", value: "+43" },
  { label: "Azerbaijan (+994)", value: "+994" },
  { label: "Bahamas (+1-242)", value: "+1242" },
  { label: "Bahrain (+973)", value: "+973" },
  { label: "Bangladesh (+880)", value: "+880" },
  { label: "Barbados (+1-246)", value: "+1246" },
  { label: "Belarus (+375)", value: "+375" },
  { label: "Belgium (+32)", value: "+32" },
  { label: "Belize (+501)", value: "+501" },
  { label: "Benin (+229)", value: "+229" },
  { label: "Bhutan (+975)", value: "+975" },
  { label: "Bolivia (+591)", value: "+591" },
  { label: "Bosnia and Herzegovina (+387)", value: "+387" },
  { label: "Botswana (+267)", value: "+267" },
  { label: "Brazil (+55)", value: "+55" },
  { label: "Brunei (+673)", value: "+673" },
  { label: "Bulgaria (+359)", value: "+359" },
  { label: "Burkina Faso (+226)", value: "+226" },
  { label: "Burundi (+257)", value: "+257" },
  { label: "Cambodia (+855)", value: "+855" },
  { label: "Cameroon (+237)", value: "+237" },
  { label: "Canada (+1)", value: "+1" },
  { label: "Cape Verde (+238)", value: "+238" },
  { label: "Central African Republic (+236)", value: "+236" },
  { label: "Chad (+235)", value: "+235" },
  { label: "Chile (+56)", value: "+56" },
  { label: "China (+86)", value: "+86" },
  { label: "Colombia (+57)", value: "+57" },
  { label: "Comoros (+269)", value: "+269" },
  { label: "Congo (+242)", value: "+242" },
  { label: "Costa Rica (+506)", value: "+506" },
  { label: "Croatia (+385)", value: "+385" },
  { label: "Cuba (+53)", value: "+53" },
  { label: "Cyprus (+357)", value: "+357" },
  { label: "Czech Republic (+420)", value: "+420" },
  { label: "Democratic Republic of the Congo (+243)", value: "+243" },
  { label: "Denmark (+45)", value: "+45" },
  { label: "Djibouti (+253)", value: "+253" },
  { label: "Dominica (+1-767)", value: "+1767" },
  { label: "Dominican Republic (+1-809)", value: "+1809" },
  { label: "Dominican Republic (+1-829)", value: "+1829" },
  { label: "Dominican Republic (+1-849)", value: "+1849" },
  { label: "Ecuador (+593)", value: "+593" },
  { label: "Egypt (+20)", value: "+20" },
  { label: "El Salvador (+503)", value: "+503" },
  { label: "Equatorial Guinea (+240)", value: "+240" },
  { label: "Eritrea (+291)", value: "+291" },
  { label: "Estonia (+372)", value: "+372" },
  { label: "Eswatini (+268)", value: "+268" },
  { label: "Ethiopia (+251)", value: "+251" },
  { label: "Fiji (+679)", value: "+679" },
  { label: "Finland (+358)", value: "+358" },
  { label: "France (+33)", value: "+33" },
  { label: "Gabon (+241)", value: "+241" },
  { label: "Gambia (+220)", value: "+220" },
  { label: "Georgia (+995)", value: "+995" },
  { label: "Germany (+49)", value: "+49" },
  { label: "Ghana (+233)", value: "+233" },
  { label: "Greece (+30)", value: "+30" },
  { label: "Grenada (+1-473)", value: "+1473" },
  { label: "Guatemala (+502)", value: "+502" },
  { label: "Guinea (+224)", value: "+224" },
  { label: "Guinea-Bissau (+245)", value: "+245" },
  { label: "Guyana (+592)", value: "+592" },
  { label: "Haiti (+509)", value: "+509" },
  { label: "Honduras (+504)", value: "+504" },
  { label: "Hungary (+36)", value: "+36" },
  { label: "Iceland (+354)", value: "+354" },
  { label: "India (+91)", value: "+91" },
  { label: "Indonesia (+62)", value: "+62" },
  { label: "Iran (+98)", value: "+98" },
  { label: "Iraq (+964)", value: "+964" },
  { label: "Ireland (+353)", value: "+353" },
  { label: "Israel (+972)", value: "+972" },
  { label: "Italy (+39)", value: "+39" },
  { label: "Ivory Coast (+225)", value: "+225" },
  { label: "Jamaica (+1-876)", value: "+1876" },
  { label: "Japan (+81)", value: "+81" },
  { label: "Jordan (+962)", value: "+962" },
  { label: "Kazakhstan (+7)", value: "+7" },
  { label: "Kenya (+254)", value: "+254" },
  { label: "Kiribati (+686)", value: "+686" },
  { label: "Kuwait (+965)", value: "+965" },
  { label: "Kyrgyzstan (+996)", value: "+996" },
  { label: "Laos (+856)", value: "+856" },
  { label: "Latvia (+371)", value: "+371" },
  { label: "Lebanon (+961)", value: "+961" },
  { label: "Lesotho (+266)", value: "+266" },
  { label: "Liberia (+231)", value: "+231" },
  { label: "Libya (+218)", value: "+218" },
  { label: "Liechtenstein (+423)", value: "+423" },
  { label: "Lithuania (+370)", value: "+370" },
  { label: "Luxembourg (+352)", value: "+352" },
  { label: "Madagascar (+261)", value: "+261" },
  { label: "Malawi (+265)", value: "+265" },
  { label: "Malaysia (+60)", value: "+60" },
  { label: "Maldives (+960)", value: "+960" },
  { label: "Mali (+223)", value: "+223" },
  { label: "Malta (+356)", value: "+356" },
  { label: "Marshall Islands (+692)", value: "+692" },
  { label: "Mauritania (+222)", value: "+222" },
  { label: "Mauritius (+230)", value: "+230" },
  { label: "Mexico (+52)", value: "+52" },
  { label: "Micronesia (+691)", value: "+691" },
  { label: "Moldova (+373)", value: "+373" },
  { label: "Monaco (+377)", value: "+377" },
  { label: "Mongolia (+976)", value: "+976" },
  { label: "Montenegro (+382)", value: "+382" },
  { label: "Morocco (+212)", value: "+212" },
  { label: "Mozambique (+258)", value: "+258" },
  { label: "Myanmar (+95)", value: "+95" },
  { label: "Namibia (+264)", value: "+264" },
  { label: "Nauru (+674)", value: "+674" },
  { label: "Nepal (+977)", value: "+977" },
  { label: "Netherlands (+31)", value: "+31" },
  { label: "New Zealand (+64)", value: "+64" },
  { label: "Nicaragua (+505)", value: "+505" },
  { label: "Niger (+227)", value: "+227" },
  { label: "Nigeria (+234)", value: "+234" },
  { label: "North Korea (+850)", value: "+850" },
  { label: "North Macedonia (+389)", value: "+389" },
  { label: "Norway (+47)", value: "+47" },
  { label: "Oman (+968)", value: "+968" },
  { label: "Pakistan (+92)", value: "+92" },
  { label: "Palau (+680)", value: "+680" },
  { label: "Palestine (+970)", value: "+970" },
  { label: "Panama (+507)", value: "+507" },
  { label: "Papua New Guinea (+675)", value: "+675" },
  { label: "Paraguay (+595)", value: "+595" },
  { label: "Peru (+51)", value: "+51" },
  { label: "Philippines (+63)", value: "+63" },
  { label: "Poland (+48)", value: "+48" },
  { label: "Portugal (+351)", value: "+351" },
  { label: "Qatar (+974)", value: "+974" },
  { label: "Romania (+40)", value: "+40" },
  { label: "Russia (+7)", value: "+7" },
  { label: "Rwanda (+250)", value: "+250" },
  { label: "Saint Kitts and Nevis (+1-869)", value: "+1869" },
  { label: "Saint Lucia (+1-758)", value: "+1758" },
  { label: "Saint Vincent and the Grenadines (+1-784)", value: "+1784" },
  { label: "Samoa (+685)", value: "+685" },
  { label: "San Marino (+378)", value: "+378" },
  { label: "Sao Tome and Principe (+239)", value: "+239" },
  { label: "Saudi Arabia (+966)", value: "+966" },
  { label: "Senegal (+221)", value: "+221" },
  { label: "Serbia (+381)", value: "+381" },
  { label: "Seychelles (+248)", value: "+248" },
  { label: "Sierra Leone (+232)", value: "+232" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "Slovakia (+421)", value: "+421" },
  { label: "Slovenia (+386)", value: "+386" },
  { label: "Solomon Islands (+677)", value: "+677" },
  { label: "Somalia (+252)", value: "+252" },
  { label: "South Africa (+27)", value: "+27" },
  { label: "South Korea (+82)", value: "+82" },
  { label: "South Sudan (+211)", value: "+211" },
  { label: "Spain (+34)", value: "+34" },
  { label: "Sri Lanka (+94)", value: "+94" },
  { label: "Sudan (+249)", value: "+249" },
  { label: "Suriname (+597)", value: "+597" },
  { label: "Sweden (+46)", value: "+46" },
  { label: "Switzerland (+41)", value: "+41" },
  { label: "Syria (+963)", value: "+963" },
  { label: "Taiwan (+886)", value: "+886" },
  { label: "Tajikistan (+992)", value: "+992" },
  { label: "Tanzania (+255)", value: "+255" },
  { label: "Thailand (+66)", value: "+66" },
  { label: "Timor-Leste (+670)", value: "+670" },
  { label: "Togo (+228)", value: "+228" },
  { label: "Tonga (+676)", value: "+676" },
  { label: "Trinidad and Tobago (+1-868)", value: "+1868" },
  { label: "Tunisia (+216)", value: "+216" },
  { label: "Turkey (+90)", value: "+90" },
  { label: "Turkmenistan (+993)", value: "+993" },
  { label: "Tuvalu (+688)", value: "+688" },
  { label: "Uganda (+256)", value: "+256" },
  { label: "Ukraine (+380)", value: "+380" },
  { label: "United Arab Emirates (+971)", value: "+971" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "United States (+1)", value: "+1" },
  { label: "Uruguay (+598)", value: "+598" },
  { label: "Uzbekistan (+998)", value: "+998" },
  { label: "Vanuatu (+678)", value: "+678" },
  { label: "Vatican City (+379)", value: "+379" },
  { label: "Venezuela (+58)", value: "+58" },
  { label: "Vietnam (+84)", value: "+84" },
  { label: "Yemen (+967)", value: "+967" },
  { label: "Zambia (+260)", value: "+260" },
  { label: "Zimbabwe (+263)", value: "+263" },
] as const;

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(payload?.message || "Request failed");
  }

  return response.json() as Promise<T>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function getLocaleFromLanguage(language: string) {
  switch (language) {
    case "hi":
      return "hi-IN";
    case "ml":
      return "ml-IN";
    case "ar":
      return "ar-AE";
    case "ta":
      return "ta-IN";
    case "es":
      return "es-ES";
    default:
      return "en-US";
  }
}

function formatTimeWithSettings(
  value: string,
  timeZone: string,
  language: string,
) {
  return new Intl.DateTimeFormat(getLocaleFromLanguage(language), {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(value));
}

function formatDateTimeWithSettings(
  value: string,
  timeZone: string,
  language: string,
) {
  return new Intl.DateTimeFormat(getLocaleFromLanguage(language), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date(value));
}

function getUserDisplayName(user: Pick<User, "name" | "email">) {
  return user.name?.trim() || user.email;
}

function getUserAvatarFallback(user: Pick<User, "name" | "email">) {
  const source = user.name?.trim() || user.email?.trim() || "?";
  return source.charAt(0).toUpperCase();
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

async function readImageFileAsDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Profile image must be 2 MB or smaller.");
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function toCalendarDayKey(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(value));
}

function diffInDaysInclusive(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86400000) + 1;
}

function splitPhoneNumber(value?: string | null) {
  const normalized = (value ?? "").trim();

  if (!normalized) {
    return { countryCode: "+91", number: "" };
  }

  const digitsOnly = normalized.replace(/[^\d+]/g, "");
  const matchedCountry = [...COUNTRY_CODE_OPTIONS]
    .sort((left, right) => right.value.length - left.value.length)
    .find((option) =>
    digitsOnly.startsWith(option.value),
  );

  if (matchedCountry) {
    return {
      countryCode: matchedCountry.value,
      number: digitsOnly.slice(matchedCountry.value.length),
    };
  }

  if (digitsOnly.startsWith("+")) {
    const parts = digitsOnly.match(/^(\+\d{1,4})(.*)$/);
    if (parts) {
      return {
        countryCode: parts[1],
        number: parts[2],
      };
    }
  }

  return { countryCode: "+91", number: digitsOnly };
}

function buildPhoneNumber(countryCode: string, number: string) {
  const digits = number.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  return `${countryCode}${digits}`.trim();
}

async function loadXlsx() {
  const mod = await import("xlsx");
  return (mod.default ?? mod) as typeof import("xlsx");
}

function decodeTextFile(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer);
  }

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(buffer);
  }

  return new TextDecoder("utf-8").decode(buffer);
}

function parseDelimitedRows(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [] as Record<string, string>[];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const splitLine = (line: string) =>
    line
      .split(delimiter)
      .map((cell) => cell.replace(/^"|"$/g, "").trim());

  const headers = splitLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitLine(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function normalizePipelineStage(stage?: string | null) {
  const normalized = (stage ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");

  switch (normalized) {
    case "CONTACTED":
      return "WARM";
    case "NEGOTIATING":
      return "HOT";
    case "CLOSED":
      return "DEAD";
    case "NEW":
    case "COLD":
    case "WARM":
    case "HOT":
    case "DEAD":
    case "CUSTOMER":
      return normalized;
    default:
      return normalized || "NEW";
  }
}

function buildKanbanStageId(title: string, existingIds: string[]) {
  const base = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "STAGE";

  let candidate = base;
  let counter = 2;

  while (existingIds.includes(candidate)) {
    candidate = `${base}_${counter}`;
    counter += 1;
  }

  return candidate;
}

function createLeadEditForm(lead: Lead): LeadEditForm {
  const phoneParts = splitPhoneNumber(lead.phone);

  return {
    name: lead.name ?? "",
    fullName: lead.fullName ?? "",
    phoneCountryCode: phoneParts.countryCode,
    phone: phoneParts.number,
    email: lead.email ?? "",
    status: lead.status,
    pipelineStage: lead.pipelineStage ?? "NEW",
    assignedToId: String(lead.assignedToId ?? ""),
    sourceCreatedTime: toDateTimeLocal(lead.sourceCreatedTime),
    externalLeadId: lead.externalLeadId ?? "",
    adId: lead.adId ?? "",
    adName: lead.adName ?? "",
    adsetId: lead.adsetId ?? "",
    adsetName: lead.adsetName ?? "",
    campaignId: lead.campaignId ?? "",
    campaignName: lead.campaignName ?? "",
    formId: lead.formId ?? "",
    formName: lead.formName ?? "",
    city: lead.city ?? "",
    budget: lead.budget ?? "",
    preferredLocation: lead.preferredLocation ?? "",
    customDisclaimerResponses: lead.customDisclaimerResponses ?? "",
    isOrganic:
      lead.isOrganic === true ? "true" : lead.isOrganic === false ? "false" : "",
    platform: lead.platform ?? "",
  };
}

function createEmptyLeadForm(): LeadFormState {
  return {
    name: "",
    fullName: "",
    phoneCountryCode: "+91",
    phone: "",
    email: "",
    status: "LEAD",
    pipelineStage: "NEW",
    assignedToId: "",
    sourceCreatedTime: "",
    externalLeadId: "",
    adId: "",
    adName: "",
    adsetId: "",
    adsetName: "",
    campaignId: "",
    campaignName: "",
    formId: "",
    formName: "",
    city: "",
    budget: "",
    preferredLocation: "",
    customDisclaimerResponses: "",
    isOrganic: "",
    platform: "",
  };
}

function isWorkspaceTab(value: string | null): value is WorkspaceTab {
  return (
    value === "DASHBOARD" ||
    value === "LEADS" ||
    value === "CUSTOMERS" ||
    value === "TEAMS" ||
    value === "CRON_JOBS" ||
    value === "PROJECTS" ||
    value === "SETTINGS"
  );
}

function parseRouteState(search: string): RouteState {
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab");
  const readId = (key: string) => {
    const value = Number(params.get(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  return {
    tab: isWorkspaceTab(tabParam) ? tabParam : "DASHBOARD",
    leadId: readId("lead"),
    teamId: readId("team"),
    projectId: readId("project"),
    taskId: readId("task"),
    transfersOpen: params.get("transfers") === "1",
  };
}

function buildRouteSearch(state: RouteState) {
  const params = new URLSearchParams();
  params.set("tab", state.tab);

  if (state.leadId) {
    params.set("lead", String(state.leadId));
  }

  if (state.teamId) {
    params.set("team", String(state.teamId));
  }

  if (state.projectId) {
    params.set("project", String(state.projectId));
  }

  if (state.taskId) {
    params.set("task", String(state.taskId));
  }

  if (state.transfersOpen) {
    params.set("transfers", "1");
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function getActionStateTone(action: Action) {
  if (action.isDone) {
    if (action.outcomeStatus === "INCOMPLETE") {
      return "red";
    }
    return "green";
  }

  return new Date(action.scheduledAt) < new Date() ? "red" : "neutral";
}

function formatActionOutcome(
  outcomeStatus: Action["outcomeStatus"],
  options: ActionFollowUpOption[] = DEFAULT_ACTION_FOLLOW_UP_OPTIONS,
) {
  return options.find((option) => option.id === outcomeStatus)?.title ?? "Pending";
}

function createActionFollowUpForm(action?: Action): ActionFollowUpForm {
  return {
    outcomeStatus: action?.outcomeStatus ?? "PENDING",
    nextActionTitle: action?.nextActionTitle ?? "",
    nextActionNotes: action?.nextActionNotes ?? "",
    nextActionScheduledAt: toDateTimeLocal(action?.nextActionScheduledAt ?? null),
  };
}

function getTaskStateTone(task: Pick<Task, "status" | "dueDate" | "completedAt" | "overdue">) {
  if (task.status === "DONE") {
    if (task.dueDate && task.completedAt) {
      return new Date(task.completedAt) <= new Date(task.dueDate) ? "green" : "red";
    }

    return "green";
  }

  return task.overdue || (task.dueDate ? new Date(task.dueDate) < new Date() : false)
    ? "red"
    : "neutral";
}

function summarizeAssignments(assignments?: DepartmentAssignment[]) {
  if (!assignments?.length) {
    return "No department / position";
  }

  return assignments
    .map((assignment) => `${assignment.department.name} - ${assignment.position.title}`)
    .join(", ");
}

function useAuthState() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(window.localStorage.getItem("crm_token"));
    setReady(true);
  }, []);

  return {
    ready,
    token,
    setToken(nextToken: string | null) {
      setToken(nextToken);
      if (nextToken) {
        window.localStorage.setItem("crm_token", nextToken);
      } else {
        window.localStorage.removeItem("crm_token");
      }
    },
  };
}

export function DashboardApp() {
  const auth = useAuthState();
  const [me, setMe] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teammates, setTeammates] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectView, setProjectView] = useState<
    "OVERVIEW" | "BOARD" | "LIST" | "CALENDAR" | "GANTT" | "ACTIVITY"
  >("OVERVIEW");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectTaskDrawer, setProjectTaskDrawer] = useState<Task | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [projectFormState, setProjectFormState] = useState({
    title: "",
    key: "",
    description: "",
    notes: "",
    status: "PLANNING" as ProjectStatus,
    ownerId: "",
    leadId: "",
    customerId: "",
    dueDate: "",
    memberIds: [] as string[],
  });
  const [projectTeamSearch, setProjectTeamSearch] = useState("");
  const [taskFormState, setTaskFormState] = useState({
    parentTaskId: "",
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    assigneeId: "",
    dueDate: "",
  });
  const [taskCommentDraft, setTaskCommentDraft] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadDrawerExpanded, setLeadDrawerExpanded] = useState(false);
  const [leadEditForm, setLeadEditForm] = useState<LeadEditForm | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [qrRequested, setQrRequested] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingSummary, setSendingSummary] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("DASHBOARD");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [routeReady, setRouteReady] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [leadPage, setLeadPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [dashboardNewPage, setDashboardNewPage] = useState(1);
  const [kanbanOwnerFilter, setKanbanOwnerFilter] = useState("ALL");
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [showBulkTransferModal, setShowBulkTransferModal] = useState(false);
  const [bulkTransferToUserId, setBulkTransferToUserId] = useState("");
  const [submittingBulkTransfer, setSubmittingBulkTransfer] = useState(false);
  const [importingLeads, setImportingLeads] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "admin@crm.local", password: "admin123" });
  const [leadForm, setLeadForm] = useState<LeadFormState>(createEmptyLeadForm());
  const [teamForm, setTeamForm] = useState({
    name: "",
    email: "",
    phoneCountryCode: "+91",
    phone: "",
    profileImageUrl: "",
    password: "",
    role: "USER" as Role,
    assignments: [{ departmentName: "", positionTitle: "" }],
  });
  const [organizationDepartments, setOrganizationDepartments] = useState<OrganizationDepartment[]>([]);
  const [departmentSettingsForm, setDepartmentSettingsForm] = useState<DepartmentSettingsFormState>([]);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>({
    timeZone: "Asia/Kolkata",
    currency: "INR",
    language: "en",
    briefingTime: "09:00",
    firstReminderMinutes: 30,
    secondReminderMinutes: 15,
  });
  const [smtpForm, setSmtpForm] = useState<SmtpSettingsState>({
    smtpHost: "",
    smtpPort: "587",
    smtpSecure: false,
    smtpUsername: "",
    smtpPassword: "",
    smtpFromEmail: "",
    smtpFromName: "",
  });
  const [kanbanStages, setKanbanStages] = useState<KanbanStage[]>(DEFAULT_KANBAN_COLUMNS);
  const [newKanbanStageTitle, setNewKanbanStageTitle] = useState("");
  const [actionFollowUpOptions, setActionFollowUpOptions] = useState<ActionFollowUpOption[]>(
    DEFAULT_ACTION_FOLLOW_UP_OPTIONS,
  );
  const [newActionFollowUpTitle, setNewActionFollowUpTitle] = useState("");
  const [actionForm, setActionForm] = useState({
    title: "",
    notes: "",
    scheduledAt: "",
  });
  const [actionFollowUpForms, setActionFollowUpForms] = useState<Record<number, ActionFollowUpForm>>({});
  const [savingActionFollowUpId, setSavingActionFollowUpId] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState({
    title: "",
    status: "PLANNING",
    notes: "",
  });
  const [pendingTransfers, setPendingTransfers] = useState<Transfer[]>([]);
  const [showTransfersDrawer, setShowTransfersDrawer] = useState(false);
  const [transferToUserId, setTransferToUserId] = useState("");
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [resolvingTransferId, setResolvingTransferId] = useState<number | null>(null);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingKanbanStages, setSavingKanbanStages] = useState(false);
  const [savingActionFollowUpOptions, setSavingActionFollowUpOptions] = useState(false);
  const [savingDepartments, setSavingDepartments] = useState(false);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);
  const [teamChatMessages, setTeamChatMessages] = useState<TeamChatMessage[]>([]);
  const [teamChatDraft, setTeamChatDraft] = useState("");
  const [loadingTeamChat, setLoadingTeamChat] = useState(false);
  const [sendingTeamChat, setSendingTeamChat] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<User | null>(null);
  const [teamEditForm, setTeamEditForm] = useState<TeamEditFormState | null>(null);
  const [savingTeamMember, setSavingTeamMember] = useState(false);
  const [cronJobLogs, setCronJobLogs] = useState<CronJobLog[]>([]);
  const [loadingCronJobLogs, setLoadingCronJobLogs] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const chatThreadRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const activeTabRef = useRef<WorkspaceTab>("DASHBOARD");
  const selectedProjectIdRef = useRef<number | null>(null);
  const routeSyncRef = useRef(false);
  const lastRouteRef = useRef<string | null>(null);

  async function openLead(leadId: number) {
    if (!auth.token) {
      return;
    }

    const payload = await api<{ lead: Lead }>(`/api/leads/${leadId}`, auth.token);
    setSelectedLead(payload.lead);
    setLeadDrawerExpanded(false);
    setTransferToUserId("");
  }

  async function loadData() {
    if (!auth.token) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [mePayload, dashboardPayload, leadsPayload, usersPayload, transfersPayload, kanbanPayload, actionFollowUpPayload] =
        await Promise.all([
          api<{ user: User }>("/api/auth/me", auth.token),
          api<DashboardPayload>("/api/dashboard", auth.token),
          api<{ leads: Lead[] }>("/api/leads", auth.token),
          api<{ users: User[] }>("/api/users", auth.token),
          api<{ transfers: Transfer[] }>("/api/transfers/pending", auth.token),
          api<{ stages: KanbanStage[] }>("/api/users/kanban-settings", auth.token),
          api<{ options: ActionFollowUpOption[] }>("/api/users/action-follow-up-settings", auth.token),
        ]);

      setMe(mePayload.user);
      setDashboard(dashboardPayload);
      setLeads(leadsPayload.leads);
      setTeammates(usersPayload.users);
      setPendingTransfers(transfersPayload.transfers);
      setKanbanStages(kanbanPayload.stages.length ? kanbanPayload.stages : DEFAULT_KANBAN_COLUMNS);
      setActionFollowUpOptions(
        actionFollowUpPayload.options.length
          ? actionFollowUpPayload.options
          : DEFAULT_ACTION_FOLLOW_UP_OPTIONS,
      );
      setSettingsForm({
        timeZone: mePayload.user.timeZone,
        currency: mePayload.user.currency,
        language: mePayload.user.language,
        briefingTime: mePayload.user.briefingTime,
        firstReminderMinutes: mePayload.user.firstReminderMinutes,
        secondReminderMinutes: mePayload.user.secondReminderMinutes,
      });

      if (mePayload.user.role === "ADMIN") {
        const [organizationPayload, departmentSettingsPayload] = await Promise.all([
          api<{ departments: OrganizationDepartment[] }>(
            "/api/users/organization-options",
            auth.token,
          ),
          api<{ departments: Array<{ name: string; positions: string[] }> }>(
            "/api/users/department-settings",
            auth.token,
          ),
        ]);
        setOrganizationDepartments(organizationPayload.departments);
        setDepartmentSettingsForm(departmentSettingsPayload.departments);
      } else {
        setOrganizationDepartments([]);
        setDepartmentSettingsForm([]);
      }
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Unable to load dashboard";
      setError(message);
      if (message.toLowerCase().includes("token")) {
        auth.setToken(null);
        setMe(null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects(projectIdToOpen?: number) {
    if (!auth.token) {
      return;
    }

    const projectPayload = await api<{ projects: Project[] }>(
      `/api/projects${projectSearch.trim() ? `?search=${encodeURIComponent(projectSearch.trim())}` : ""}`,
      auth.token,
    );
    setProjects(projectPayload.projects);

    const nextProjectId =
      projectIdToOpen ??
      selectedProject?.id ??
      projectPayload.projects[0]?.id;

    if (nextProjectId) {
      const detailPayload = await api<{ project: Project }>(`/api/projects/${nextProjectId}`, auth.token);
      setSelectedProject(detailPayload.project);
    } else {
      setSelectedProject(null);
    }
  }

  async function loadMyTasks() {
    if (!auth.token || !me) {
      return;
    }

    const payload = await api<{ tasks: Task[] }>(
      `/api/tasks?assigneeId=${me.id}`,
      auth.token,
    );
    setMyTasks(payload.tasks);
  }

  async function openProjectWorkspace(projectId: number) {
    if (!auth.token) {
      return;
    }

    if (selectedProject?.id && socketRef.current?.connected) {
      socketRef.current.emit("project:unsubscribe", { projectId: selectedProject.id });
    }

    const payload = await api<{ project: Project }>(`/api/projects/${projectId}`, auth.token);
    setSelectedProject(payload.project);
    setProjectTaskDrawer(null);

    if (socketRef.current?.connected) {
      socketRef.current.emit("project:subscribe", { projectId });
    }
  }

  async function createWorkspaceProject(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token) {
      return;
    }

    const payload = await api<{ project: Project }>("/api/projects", auth.token, {
      method: "POST",
      body: JSON.stringify({
        title: projectFormState.title,
        key: projectFormState.key || null,
        description: projectFormState.description || null,
        notes: projectFormState.notes || null,
        status: projectFormState.status,
        ownerId: projectFormState.ownerId ? Number(projectFormState.ownerId) : undefined,
        leadId: projectFormState.leadId ? Number(projectFormState.leadId) : null,
        customerId: projectFormState.customerId ? Number(projectFormState.customerId) : null,
        dueDate: projectFormState.dueDate ? new Date(projectFormState.dueDate).toISOString() : null,
        members: projectFormState.memberIds.map((userId) => ({
          userId: Number(userId),
          role: "MEMBER",
        })),
      }),
    });

    setShowProjectForm(false);
    setProjectFormState({
      title: "",
      key: "",
      description: "",
      notes: "",
      status: "PLANNING",
      ownerId: "",
      leadId: "",
      customerId: "",
      dueDate: "",
      memberIds: [],
    });
    await loadProjects(payload.project.id);
  }

  async function createWorkspaceTask(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || !selectedProject) {
      return;
    }

    const payload = await api<{ task: Task }>("/api/tasks", auth.token, {
      method: "POST",
      body: JSON.stringify({
        projectId: selectedProject.id,
        parentTaskId: taskFormState.parentTaskId ? Number(taskFormState.parentTaskId) : null,
        title: taskFormState.title,
        description: taskFormState.description || null,
        status: taskFormState.status,
        priority: taskFormState.priority,
        assigneeId: taskFormState.assigneeId ? Number(taskFormState.assigneeId) : null,
        dueDate: taskFormState.dueDate ? new Date(taskFormState.dueDate).toISOString() : null,
      }),
    });

    setShowTaskForm(false);
    setTaskFormState({
      parentTaskId: "",
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: "",
      dueDate: "",
    });
    setProjectTaskDrawer(payload.task);
    await openProjectWorkspace(selectedProject.id);
    await loadMyTasks();
  }

  async function saveProjectDetails(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || !selectedProject) {
      return;
    }

    const payload = await api<{ project: Project }>(`/api/projects/${selectedProject.id}`, auth.token, {
      method: "PATCH",
      body: JSON.stringify({
        title: selectedProject.title,
        key: selectedProject.key || null,
        description: selectedProject.description || null,
        notes: selectedProject.notes || null,
        status: selectedProject.status,
        ownerId: selectedProject.ownerId,
        leadId: selectedProject.leadId ?? null,
        customerId: selectedProject.customerId ?? null,
        dueDate: selectedProject.dueDate ? new Date(selectedProject.dueDate).toISOString() : null,
        members:
          selectedProject.members?.map((member) => ({
            userId: member.userId,
            role: member.role,
          })) ?? [],
      }),
    });

    setSelectedProject(payload.project);
    await loadProjects(payload.project.id);
  }

  async function openProjectTask(taskId: number) {
    if (!auth.token) {
      return;
    }

    const payload = await api<{ task: Task }>(`/api/tasks/${taskId}`, auth.token);
    setProjectTaskDrawer(payload.task);
  }

  async function updateProjectTask(taskId: number, patch: Partial<Task>) {
    if (!auth.token || !selectedProject) {
      return;
    }

    await api<{ task: Task }>(`/api/tasks/${taskId}`, auth.token, {
      method: "PATCH",
      body: JSON.stringify({
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        assigneeId: patch.assigneeId ?? null,
        dueDate: patch.dueDate ? new Date(patch.dueDate).toISOString() : patch.dueDate === null ? null : undefined,
      }),
    });

    await openProjectWorkspace(selectedProject.id);
    await loadMyTasks();
  }

  async function moveProjectTask(taskId: number, status: TaskStatus, sortOrder: number) {
    if (!auth.token || !selectedProject) {
      return;
    }

    await api<{ task: Task }>(`/api/tasks/${taskId}/move`, auth.token, {
      method: "PATCH",
      body: JSON.stringify({ status, sortOrder }),
    });

    await openProjectWorkspace(selectedProject.id);
    await loadMyTasks();
  }

  async function addProjectTaskComment(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || !projectTaskDrawer || !taskCommentDraft.trim()) {
      return;
    }

    await api<{ comment: TaskComment }>(`/api/tasks/${projectTaskDrawer.id}/comments`, auth.token, {
      method: "POST",
      body: JSON.stringify({ content: taskCommentDraft.trim() }),
    });

    setTaskCommentDraft("");
    if (selectedProject) {
      await openProjectWorkspace(selectedProject.id);
      const refreshed = await api<{ task: Task }>(`/api/tasks/${projectTaskDrawer.id}`, auth.token);
      setProjectTaskDrawer(refreshed.task);
    }
  }

  async function deleteProjectTask(taskId: number) {
    if (!auth.token || !selectedProject) {
      return;
    }

    await api(`/api/tasks/${taskId}`, auth.token, {
      method: "DELETE",
    });

    if (projectTaskDrawer?.id === taskId) {
      setProjectTaskDrawer(null);
    }

    await openProjectWorkspace(selectedProject.id);
    await loadMyTasks();
  }

  useEffect(() => {
    if (auth.token) {
      void loadData();
    }
  }, [auth.token]);

  useEffect(() => {
    if (auth.token && activeTab === "PROJECTS") {
      void loadProjects();
      void loadMyTasks();
    }
  }, [activeTab, auth.token]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProject?.id ?? null;
  }, [selectedProject?.id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromUrl = async () => {
      const nextRoute = parseRouteState(window.location.search);
      routeSyncRef.current = true;

      setActiveTab(nextRoute.tab);
      setShowTransfersDrawer(nextRoute.transfersOpen);

      if (!auth.token) {
        routeSyncRef.current = false;
        setRouteReady(true);
        return;
      }

      try {
        if (nextRoute.leadId) {
          await openLead(nextRoute.leadId);
        } else {
          setSelectedLead(null);
        }

        if (nextRoute.teamId) {
          await openTeamMember(nextRoute.teamId);
        } else {
          setSelectedTeamMember(null);
        }

        if (nextRoute.projectId) {
          await openProjectWorkspace(nextRoute.projectId);

          if (nextRoute.taskId) {
            await openProjectTask(nextRoute.taskId);
          } else {
            setProjectTaskDrawer(null);
          }
        } else {
          setSelectedProject(null);
          setProjectTaskDrawer(null);
        }
      } finally {
        routeSyncRef.current = false;
        setRouteReady(true);
      }
    };

    void syncFromUrl();

    const onPopState = () => {
      void syncFromUrl();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [auth.token]);

  useEffect(() => {
    if (typeof window === "undefined" || routeSyncRef.current || !routeReady) {
      return;
    }

    const nextSearch = buildRouteSearch({
      tab: activeTab,
      leadId: selectedLead?.id ?? null,
      teamId: selectedTeamMember?.id ?? null,
      projectId: selectedProject?.id ?? null,
      taskId: projectTaskDrawer?.id ?? null,
      transfersOpen: showTransfersDrawer,
    });

    if (lastRouteRef.current === nextSearch) {
      return;
    }

    const nextUrl = `${window.location.pathname}${nextSearch}`;

    if (lastRouteRef.current === null) {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }

    lastRouteRef.current = nextSearch;
  }, [
    activeTab,
    projectTaskDrawer?.id,
    routeReady,
    selectedLead?.id,
    selectedProject?.id,
    selectedTeamMember?.id,
    showTransfersDrawer,
  ]);

  useEffect(() => {
    if (auth.token && activeTab === "PROJECTS") {
      void loadProjects();
    }
  }, [projectSearch]);

  useEffect(() => {
    if (!auth.token || !me) {
      return;
    }

    const socket = io(browserBackendUrl, {
      path: "/socket.io",
      auth: {
        token: auth.token,
      },
      transports: ["websocket"],
    }) as Socket;

    socketRef.current = socket;

    setSocketStatus("connecting");

    socket.on("connect", () => {
      setSocketStatus("live");
      setConnectionMessage("Socket bridge connected. Waiting for WhatsApp session state.");
    });

    socket.on("disconnect", () => {
      setSocketStatus("idle");
      setConnectionMessage("Socket bridge disconnected.");
    });

    socket.on("whatsapp:qr", (payload: { qr: string }) => {
      setQr(payload.qr);
      setQrRequested(true);
      setConnectionMessage("QR code received. Scan with WhatsApp Linked Devices.");
    });

    socket.on("whatsapp:connected", async () => {
      setQr(null);
      setQrRequested(false);
      setConnectionMessage("WhatsApp connected.");
      await loadData();
    });

    socket.on("whatsapp:disconnected", async (payload?: { message?: string }) => {
      setQr(null);
      setQrRequested(false);
      setConnectionMessage(
        payload?.message || "WhatsApp disconnected. A new QR code may be required.",
      );
      await loadData();
    });

    const refreshProjectWorkspace = async (projectId: number) => {
      if (activeTabRef.current !== "PROJECTS" || !auth.token) {
        return;
      }

      await loadProjects(selectedProjectIdRef.current ?? projectId);
      await loadMyTasks();

      if (projectTaskDrawer && projectTaskDrawer.projectId === projectId) {
        try {
          const refreshed = await api<{ task: Task }>(`/api/tasks/${projectTaskDrawer.id}`, auth.token);
          setProjectTaskDrawer(refreshed.task);
        } catch {
          setProjectTaskDrawer(null);
        }
      }
    };

    socket.on(
      "project.updated",
      (payload: { projectId: number; project?: Project }) => {
        if (payload.projectId === selectedProjectIdRef.current) {
          void refreshProjectWorkspace(payload.projectId);
        } else if (activeTabRef.current === "PROJECTS") {
          void loadProjects(selectedProjectIdRef.current ?? undefined);
        }
      },
    );
    socket.on(
      "task.created",
      (payload: { projectId: number }) => {
        if (payload.projectId === selectedProjectIdRef.current) {
          void refreshProjectWorkspace(payload.projectId);
        }
      },
    );
    socket.on(
      "task.updated",
      (payload: { projectId: number; task: Task }) => {
        if (payload.projectId === selectedProjectIdRef.current) {
          void refreshProjectWorkspace(payload.projectId);
        }
      },
    );
    socket.on(
      "task.deleted",
      (payload: { projectId: number; taskId: number }) => {
        if (payload.projectId === selectedProjectIdRef.current) {
          if (projectTaskDrawer?.id === payload.taskId) {
            setProjectTaskDrawer(null);
          }
          void refreshProjectWorkspace(payload.projectId);
        }
      },
    );
    socket.on(
      "task.moved",
      (payload: { projectId: number }) => {
        if (payload.projectId === selectedProjectIdRef.current) {
          void refreshProjectWorkspace(payload.projectId);
        }
      },
    );
    socket.on(
      "task.commented",
      (payload: { projectId: number }) => {
        if (payload.projectId === selectedProjectIdRef.current) {
          void refreshProjectWorkspace(payload.projectId);
        }
      },
    );

    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, [auth.token, me?.id, projectTaskDrawer]);

  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !socket.connected) {
      return;
    }

    if (selectedProject?.id) {
      socket.emit("project:subscribe", { projectId: selectedProject.id });
    }

    return () => {
      if (selectedProject?.id) {
        socket.emit("project:unsubscribe", { projectId: selectedProject.id });
      }
    };
  }, [selectedProject?.id, socketStatus]);

  useEffect(() => {
    if (!auth.token || !me?.needsReauth || qr) {
      return;
    }

    const token = auth.token;

    const interval = window.setInterval(async () => {
      try {
        const state = await api<{
          qr: string | null;
          whatsappConnected: boolean;
          needsReauth: boolean;
        }>("/api/whatsapp/session/state", token);

        if (state.qr) {
          setQr(state.qr);
          setQrRequested(true);
          setConnectionMessage("QR code received. Scan with WhatsApp Linked Devices.");
        }
      } catch {
        // Ignore polling errors and let the socket/init path continue.
      }
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [auth.token, me?.needsReauth, qr]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setShowLeadForm(true);
      }

      if (event.key === "Escape") {
        setSelectedLead(null);
        setLeadDrawerExpanded(false);
        setShowLeadForm(false);
        setShowTeamForm(false);
        setShowImportModal(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [auth.token]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

    const applyTitles = () => {
      const buttons = document.querySelectorAll("button");

      buttons.forEach((button) => {
        if (button.getAttribute("title")) {
          return;
        }

        const ariaLabel = normalize(button.getAttribute("aria-label") ?? "");
        const text = normalize(button.textContent ?? "");
        const tooltip = ariaLabel || text;

        if (tooltip) {
          button.setAttribute("title", tooltip);
        }
      });
    };

    applyTitles();

    const observer = new MutationObserver(() => {
      applyTitles();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedLead) {
      setLeadEditForm(null);
      setActionFollowUpForms({});
      return;
    }

    setLeadEditForm(createLeadEditForm(selectedLead));
    setActionFollowUpForms(
      Object.fromEntries(
        (selectedLead.actions ?? []).map((action) => [action.id, createActionFollowUpForm(action)]),
      ),
    );
  }, [selectedLead]);

  useEffect(() => {
    if (!selectedTeamMember) {
      setTeamEditForm(null);
      return;
    }

    const phoneParts = splitPhoneNumber(selectedTeamMember.phone);

    setTeamEditForm({
      name: selectedTeamMember.name,
      email: selectedTeamMember.email,
      phoneCountryCode: phoneParts.countryCode,
      phone: phoneParts.number,
      profileImageUrl: selectedTeamMember.profileImageUrl ?? "",
      role: selectedTeamMember.role,
      timeZone: selectedTeamMember.timeZone,
      currency: selectedTeamMember.currency,
      briefingTime: selectedTeamMember.briefingTime,
      firstReminderMinutes: selectedTeamMember.firstReminderMinutes,
      secondReminderMinutes: selectedTeamMember.secondReminderMinutes,
      assignments:
        organizationDepartments.length && selectedTeamMember.departmentAssignments?.length
          ? selectedTeamMember.departmentAssignments.map((assignment) => ({
              departmentName: assignment.department.name,
              positionTitle: assignment.position.title,
            }))
          : [],
    });
  }, [organizationDepartments.length, selectedTeamMember]);

  useEffect(() => {
    if (!auth.token || !me || activeTab !== "SETTINGS" || me.role !== "ADMIN") {
      return;
    }

    const token = auth.token;

    void (async () => {
      try {
        const payload = await api<{ smtp: {
          smtpHost: string | null;
          smtpPort: number | null;
          smtpSecure: boolean;
          smtpUsername: string | null;
          smtpPassword: string | null;
          smtpFromEmail: string | null;
          smtpFromName: string | null;
        } }>("/api/users/smtp-settings", token);

        setSmtpForm({
          smtpHost: payload.smtp.smtpHost ?? "",
          smtpPort: payload.smtp.smtpPort ? String(payload.smtp.smtpPort) : "587",
          smtpSecure: payload.smtp.smtpSecure,
          smtpUsername: payload.smtp.smtpUsername ?? "",
          smtpPassword: payload.smtp.smtpPassword ?? "",
          smtpFromEmail: payload.smtp.smtpFromEmail ?? "",
          smtpFromName: payload.smtp.smtpFromName ?? "",
        });
      } catch (smtpError) {
        setError(smtpError instanceof Error ? smtpError.message : "Failed to load SMTP settings");
      }
    })();
  }, [activeTab, auth.token, me]);

  async function saveSettings(patch: Partial<SettingsFormState>) {
    if (!auth.token || !me) {
      return;
    }

    const nextSettings = { ...settingsForm, ...patch };
    setSettingsForm(nextSettings);

    if (
      nextSettings.briefingTime &&
      !/^\d{2}:\d{2}$/.test(nextSettings.briefingTime)
    ) {
      return;
    }

    setSavingSettings(true);

    try {
      const payload = await api<{ user: User }>("/api/users/settings", auth.token, {
        method: "PATCH",
        body: JSON.stringify({
          ...nextSettings,
          language: nextSettings.language || me.language || "en",
        }),
      });
      setMe(payload.user);
      setSettingsForm({
        timeZone: payload.user.timeZone,
        currency: payload.user.currency,
        language: payload.user.language,
        briefingTime: payload.user.briefingTime,
        firstReminderMinutes: payload.user.firstReminderMinutes,
        secondReminderMinutes: payload.user.secondReminderMinutes,
      });
      setConnectionMessage("Settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save settings");
      setSettingsForm({
        timeZone: me.timeZone,
        currency: me.currency,
        language: me.language,
        briefingTime: me.briefingTime,
        firstReminderMinutes: me.firstReminderMinutes,
        secondReminderMinutes: me.secondReminderMinutes,
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveSmtpSettings(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || me?.role !== "ADMIN") {
      return;
    }

    setSavingSmtp(true);

    try {
      const payload = await api<{ smtp: {
        smtpHost: string | null;
        smtpPort: number | null;
        smtpSecure: boolean;
        smtpUsername: string | null;
        smtpPassword: string | null;
        smtpFromEmail: string | null;
        smtpFromName: string | null;
      } }>("/api/users/smtp-settings", auth.token, {
        method: "PATCH",
        body: JSON.stringify({
          smtpHost: smtpForm.smtpHost,
          smtpPort: Number(smtpForm.smtpPort),
          smtpSecure: smtpForm.smtpSecure,
          smtpUsername: smtpForm.smtpUsername,
          smtpPassword: smtpForm.smtpPassword,
          smtpFromEmail: smtpForm.smtpFromEmail,
          smtpFromName: smtpForm.smtpFromName,
        }),
      });

      setSmtpForm({
        smtpHost: payload.smtp.smtpHost ?? "",
        smtpPort: payload.smtp.smtpPort ? String(payload.smtp.smtpPort) : "587",
        smtpSecure: payload.smtp.smtpSecure,
        smtpUsername: payload.smtp.smtpUsername ?? "",
        smtpPassword: payload.smtp.smtpPassword ?? "",
        smtpFromEmail: payload.smtp.smtpFromEmail ?? "",
        smtpFromName: payload.smtp.smtpFromName ?? "",
      });
      setConnectionMessage("Global SMTP settings saved.");
    } catch (smtpError) {
      setError(smtpError instanceof Error ? smtpError.message : "Failed to save SMTP settings");
    } finally {
      setSavingSmtp(false);
    }
  }

  async function saveKanbanSettings(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || me?.role !== "ADMIN") {
      return;
    }

    setSavingKanbanStages(true);

    try {
      const payload = await api<{ stages: KanbanStage[] }>("/api/users/kanban-settings", auth.token, {
        method: "PATCH",
        body: JSON.stringify({ stages: kanbanStages }),
      });
      setKanbanStages(payload.stages);
      setConnectionMessage("Global kanban stages saved.");
    } catch (kanbanError) {
      setError(kanbanError instanceof Error ? kanbanError.message : "Failed to save kanban stages");
    } finally {
      setSavingKanbanStages(false);
    }
  }

  async function saveDepartmentSettings(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || me?.role !== "ADMIN") {
      return;
    }

    setSavingDepartments(true);

    try {
      const payload = await api<{ departments: Array<{ name: string; positions: string[] }> }>(
        "/api/users/department-settings",
        auth.token,
        {
          method: "PATCH",
          body: JSON.stringify({
            departments: departmentSettingsForm
              .map((department) => ({
                name: department.name.trim(),
                positions: department.positions.map((position) => position.trim()).filter(Boolean),
              }))
              .filter((department) => department.name),
          }),
        },
      );

      setDepartmentSettingsForm(payload.departments);
      const organizationPayload = await api<{ departments: OrganizationDepartment[] }>(
        "/api/users/organization-options",
        auth.token,
      );
      setOrganizationDepartments(organizationPayload.departments);
      setConnectionMessage("Department settings saved.");
    } catch (departmentError) {
      setError(
        departmentError instanceof Error
          ? departmentError.message
          : "Failed to save department settings",
      );
    } finally {
      setSavingDepartments(false);
    }
  }

  function addKanbanStage() {
    const title = newKanbanStageTitle.trim();

    if (!title) {
      setError("Enter a stage name before adding it.");
      return;
    }

    setKanbanStages((current) => [
      ...current,
      {
        id: buildKanbanStageId(
          title,
          current.map((stage) => stage.id),
        ),
        title,
      },
    ]);
    setNewKanbanStageTitle("");
  }

  function removeKanbanStage(stageId: string) {
    if (REQUIRED_KANBAN_STAGE_IDS.includes(stageId as (typeof REQUIRED_KANBAN_STAGE_IDS)[number])) {
      return;
    }

    setKanbanStages((current) => current.filter((stage) => stage.id !== stageId));
  }

  function buildActionFollowUpOptionId(
    title: string,
    existingIds: string[],
  ) {
    const normalizedBase =
      title
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "FOLLOW_UP";

    let candidate = normalizedBase;
    let suffix = 2;

    while (existingIds.includes(candidate)) {
      candidate = `${normalizedBase}_${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  function addActionFollowUpOption() {
    const title = newActionFollowUpTitle.trim();

    if (!title) {
      setError("Enter a follow-up label before adding it.");
      return;
    }

    setActionFollowUpOptions((current) => [
      ...current,
      {
        id: buildActionFollowUpOptionId(
          title,
          current.map((option) => option.id),
        ),
        title,
      },
    ]);
    setNewActionFollowUpTitle("");
  }

  function removeActionFollowUpOption(optionId: string) {
    setActionFollowUpOptions((current) => current.filter((option) => option.id !== optionId));
  }

  async function saveActionFollowUpSettings(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || me?.role !== "ADMIN") {
      return;
    }

    setSavingActionFollowUpOptions(true);

    try {
      const payload = await api<{ options: ActionFollowUpOption[] }>(
        "/api/users/action-follow-up-settings",
        auth.token,
        {
          method: "PATCH",
          body: JSON.stringify({ options: actionFollowUpOptions }),
        },
      );
      setActionFollowUpOptions(payload.options);
      setConnectionMessage("Action follow-up options saved.");
    } catch (followUpError) {
      setError(
        followUpError instanceof Error
          ? followUpError.message
          : "Failed to save action follow-up options",
      );
    } finally {
      setSavingActionFollowUpOptions(false);
    }
  }

  async function loadTeamChat(userId: number) {
    if (!auth.token) {
      return;
    }

    setLoadingTeamChat(true);

    try {
      const payload = await api<{ messages: TeamChatMessage[] }>(
        `/api/users/${userId}/messages`,
        auth.token,
      );
      setTeamChatMessages(payload.messages);
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Failed to load team chat");
      setTeamChatMessages([]);
    } finally {
      setLoadingTeamChat(false);
    }
  }

  async function sendTeamChatMessage(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || !activeChatUserId || !teamChatDraft.trim()) {
      return;
    }

    setSendingTeamChat(true);

    try {
      const payload = await api<{ ok: boolean; message: TeamChatMessage }>(
        `/api/users/${activeChatUserId}/message`,
        auth.token,
        {
          method: "POST",
          body: JSON.stringify({ message: teamChatDraft.trim() }),
        },
      );

      setTeamChatMessages((current) => [...current, payload.message]);
      setTeamChatDraft("");
      const activeUser = teammates.find((user) => user.id === activeChatUserId);
      setConnectionMessage(
        activeUser
          ? `Message sent to ${getUserDisplayName(activeUser)}.`
          : "Message sent to teammate.",
      );
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : "Failed to send message");
    } finally {
      setSendingTeamChat(false);
    }
  }

  async function openTeamMember(userId: number) {
    if (!auth.token) {
      return;
    }

    try {
      const payload = await api<{ user: User }>(`/api/users/${userId}`, auth.token);
      setSelectedTeamMember(payload.user);
    } catch (teamError) {
      setError(teamError instanceof Error ? teamError.message : "Failed to load team member");
    }
  }

  async function saveTeamMember(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token || !selectedTeamMember || !teamEditForm || me?.role !== "ADMIN") {
      return;
    }

    setSavingTeamMember(true);

    try {
    const payload = await api<{ user: User }>(`/api/users/${selectedTeamMember.id}`, auth.token, {
      method: "PATCH",
      body: JSON.stringify({
        ...teamEditForm,
        phone: buildPhoneNumber(teamEditForm.phoneCountryCode, teamEditForm.phone),
        profileImageUrl: teamEditForm.profileImageUrl || "",
        assignments: teamEditForm.assignments.filter(
          (assignment) => assignment.departmentName.trim() && assignment.positionTitle.trim(),
        ),
      }),
    });

      setSelectedTeamMember(payload.user);
      setTeammates((current) =>
        current.map((user) => (user.id === payload.user.id ? { ...user, ...payload.user } : user)),
      );
      if (me?.id === payload.user.id) {
        setMe((current) => (current ? { ...current, ...payload.user } : current));
      }
      setConnectionMessage("Team member profile saved.");
    } catch (teamError) {
      setError(teamError instanceof Error ? teamError.message : "Failed to save team member");
    } finally {
      setSavingTeamMember(false);
    }
  }

  async function loadCronJobLogs() {
    if (!auth.token || me?.role !== "ADMIN") {
      return;
    }

    setLoadingCronJobLogs(true);

    try {
      const payload = await api<{ logs: CronJobLog[] }>("/api/admin/cron-jobs?limit=150", auth.token);
      setCronJobLogs(payload.logs);
    } catch (cronError) {
      setError(cronError instanceof Error ? cronError.message : "Failed to load cron job logs");
    } finally {
      setLoadingCronJobLogs(false);
    }
  }

  const filteredLeads = useMemo(() => {
    if (activeTab === "DASHBOARD") {
      return leads.filter((lead) => lead.assignedToId === me?.id);
    }

    return leads.filter((lead) =>
      activeTab === "CUSTOMERS" ? lead.status === "CUSTOMER" : lead.status === "LEAD",
    );
  }, [activeTab, leads, me?.id]);

  const filteredTodayActions = useMemo(() => {
    if (activeTab === "DASHBOARD") {
      return dashboard?.todayActions ?? [];
    }

    return (
      dashboard?.todayActions.filter((action) =>
        activeTab === "CUSTOMERS"
          ? action.lead.status === "CUSTOMER"
          : action.lead.status === "LEAD",
      ) ?? []
    );
  }, [activeTab, dashboard?.todayActions]);

  const filteredTodayProjectTasks = useMemo(
    () => dashboard?.todayProjectTasks ?? [],
    [dashboard?.todayProjectTasks],
  );

  const pipelineStageOptions = useMemo(
    () =>
      kanbanStages
        .filter((column) => column.id !== "CUSTOMER")
        .map((column) => ({ label: column.title, value: column.id })),
    [kanbanStages],
  );

  const stageLabelMap = useMemo(
    () => new Map<string, string>(kanbanStages.map((stage) => [stage.id, stage.title])),
    [kanbanStages],
  );

  function getStageLabel(stage?: string | null) {
    const normalizedStage = normalizePipelineStage(stage);
    return stageLabelMap.get(normalizedStage) ?? normalizedStage;
  }

  const groupedLeads = useMemo(() => {
    const kanbanLeads =
      activeTab === "DASHBOARD"
        ? filteredLeads.filter(
            (lead) =>
              normalizePipelineStage(lead.pipelineStage) === "NEW" ||
              filteredTodayActions.some((action) => action.lead.id === lead.id),
          )
        : filteredLeads;

    const ownerFilteredLeads =
      activeTab !== "LEADS" || kanbanOwnerFilter === "ALL"
        ? kanbanLeads
        : kanbanLeads.filter((lead) => String(lead.assignedToId) === kanbanOwnerFilter);

    return kanbanStages.map((column) => ({
      ...column,
      leads: ownerFilteredLeads.filter((lead) =>
        column.id === "CUSTOMER"
          ? lead.status === "CUSTOMER"
          : lead.status !== "CUSTOMER" &&
            normalizePipelineStage(lead.pipelineStage) === column.id,
      ),
    }));
  }, [activeTab, filteredLeads, filteredTodayActions, kanbanOwnerFilter, kanbanStages]);

  const dashboardNewColumn = useMemo(
    () => groupedLeads.find((column) => column.id === "NEW") ?? null,
    [groupedLeads],
  );

  const dashboardNewTotalPages = Math.max(
    1,
    Math.ceil((dashboardNewColumn?.leads.length ?? 0) / DASHBOARD_NEW_PAGE_SIZE),
  );

  const selectableUsers = useMemo(() => {
    const users = me ? [me, ...teammates] : teammates;
    return users.filter(
      (user, index, array) => array.findIndex((candidate) => candidate.id === user.id) === index,
    );
  }, [me, teammates]);

  const leadOwnerFilteredLeads = useMemo(() => {
    if (activeTab !== "LEADS" || kanbanOwnerFilter === "ALL") {
      return filteredLeads;
    }

    return filteredLeads.filter((lead) => String(lead.assignedToId) === kanbanOwnerFilter);
  }, [activeTab, filteredLeads, kanbanOwnerFilter]);

  const searchedLeads = useMemo(() => {
    const query = leadSearch.trim().toLowerCase();

    if (!query) {
      return leadOwnerFilteredLeads;
    }

    return leadOwnerFilteredLeads.filter((lead) =>
      [lead.name, lead.phone, lead.email ?? "", lead.assignedTo?.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [leadOwnerFilteredLeads, leadSearch]);

  const searchableTeams = useMemo(() => {
    const query = teamSearch.trim().toLowerCase();

    if (!query) {
      return selectableUsers;
    }

    return selectableUsers.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        summarizeAssignments(user.departmentAssignments),
        user.whatsappConnected ? "connected" : "disconnected",
        user.needsReauth ? "needs qr" : "ready",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [selectableUsers, teamSearch]);

  const filteredProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) =>
      [project.title, project.key ?? "", project.description ?? "", project.owner?.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [projectSearch, projects]);

  const groupedProjectTasks = useMemo(
    () =>
      TASK_STATUS_OPTIONS.map((column) => ({
        ...column,
        tasks: (selectedProject?.tasks ?? []).filter(
          (task) => task.parentTaskId == null && task.status === column.value,
        ),
      })),
    [selectedProject?.tasks],
  );

  const projectTaskCounts = useMemo(() => {
    const tasks = selectedProject?.tasks ?? [];
    const rootTasks = tasks.filter((task) => task.parentTaskId == null);

    return {
      total: rootTasks.length,
      done: rootTasks.filter((task) => task.status === "DONE").length,
      overdue: rootTasks.filter((task) => task.overdue).length,
      inProgress: rootTasks.filter((task) => task.status === "IN_PROGRESS").length,
    };
  }, [selectedProject?.tasks]);

  const projectListTasks = useMemo(
    () =>
      (selectedProject?.tasks ?? []).filter((task) => task.parentTaskId == null),
    [selectedProject?.tasks],
  );

  const projectMembersForAssign = useMemo(
    () =>
      selectedProject?.members?.map((member) => ({
        label: getUserDisplayName(member.user),
        value: String(member.userId),
      })) ?? [],
    [selectedProject?.members],
  );

  const filteredProjectTeamOptions = useMemo(() => {
    const query = projectTeamSearch.trim().toLowerCase();

    if (!query) {
      return selectableUsers;
    }

    return selectableUsers.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        summarizeAssignments(user.departmentAssignments),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [projectTeamSearch, selectableUsers]);

  const paginatedLeads = useMemo(
    () => searchedLeads.slice((leadPage - 1) * LIST_PAGE_SIZE, leadPage * LIST_PAGE_SIZE),
    [leadPage, searchedLeads],
  );

  const paginatedCustomers = useMemo(
    () => filteredLeads.slice((customerPage - 1) * LIST_PAGE_SIZE, customerPage * LIST_PAGE_SIZE),
    [customerPage, filteredLeads],
  );

  const paginatedTeams = useMemo(
    () => searchableTeams.slice((teamPage - 1) * LIST_PAGE_SIZE, teamPage * LIST_PAGE_SIZE),
    [searchableTeams, teamPage],
  );

  useEffect(() => {
    setLeadPage(1);
  }, [leadSearch]);

  useEffect(() => {
    if (activeTab === "LEADS") {
      setLeadPage(1);
    }
  }, [activeTab, kanbanOwnerFilter]);

  useEffect(() => {
    setTeamPage(1);
  }, [teamSearch]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(searchedLeads.length / LIST_PAGE_SIZE));
    if (leadPage > totalPages) {
      setLeadPage(totalPages);
    }
  }, [leadPage, searchedLeads.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredLeads.length / LIST_PAGE_SIZE));
    if (customerPage > totalPages) {
      setCustomerPage(totalPages);
    }
  }, [customerPage, filteredLeads.length]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(searchableTeams.length / LIST_PAGE_SIZE));
    if (teamPage > totalPages) {
      setTeamPage(totalPages);
    }
  }, [searchableTeams.length, teamPage]);

  useEffect(() => {
    if (activeTab === "LEADS") {
      setLeadPage(1);
    }

    if (activeTab === "CUSTOMERS") {
      setCustomerPage(1);
    }

    if (activeTab === "TEAMS") {
      setTeamPage(1);
    }

    if (activeTab === "DASHBOARD") {
      setDashboardNewPage(1);
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedLeadIds((current) =>
      current.filter((leadId) => leads.some((lead) => lead.id === leadId && lead.status === "LEAD")),
    );
  }, [leads]);

  useEffect(() => {
    if (dashboardNewPage > dashboardNewTotalPages) {
      setDashboardNewPage(dashboardNewTotalPages);
    }
  }, [dashboardNewPage, dashboardNewTotalPages]);

  const chatTeammates = useMemo(
    () => selectableUsers.filter((user) => user.id !== me?.id),
    [me?.id, selectableUsers],
  );

  const activeChatUser = useMemo(
    () => chatTeammates.find((user) => user.id === activeChatUserId) ?? null,
    [activeChatUserId, chatTeammates],
  );

  const projectFocusMode = activeTab === "PROJECTS" && Boolean(selectedProject);
  const sidebarCompact = sidebarCollapsed || projectFocusMode;

  useEffect(() => {
    if (chatTeammates.length === 0) {
      setActiveChatUserId(null);
      setTeamChatMessages([]);
      return;
    }

    setActiveChatUserId((current) =>
      current && chatTeammates.some((user) => user.id === current)
        ? current
        : chatTeammates[0].id,
    );
  }, [chatTeammates]);

  useEffect(() => {
    if (!auth.token || !activeChatUserId) {
      return;
    }

    void loadTeamChat(activeChatUserId);
  }, [activeChatUserId, auth.token]);

  useEffect(() => {
    if (activeTab !== "CRON_JOBS" || me?.role !== "ADMIN") {
      return;
    }

    void loadCronJobLogs();
  }, [activeTab, me?.role, auth.token]);

  useEffect(() => {
    if (!chatThreadRef.current) {
      return;
    }

    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
  }, [teamChatMessages, loadingTeamChat, activeChatUserId]);

  const workspaceItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: "DASHBOARD", label: "Dashboard", icon: LayoutDashboard },
    {
      id: "LEADS",
      label: "Leads",
      icon: Columns3,
      count: leads.filter((lead) => lead.status === "LEAD").length,
    },
    {
      id: "CUSTOMERS",
      label: "Customers",
      icon: CheckCircle2,
      count: leads.filter((lead) => lead.status === "CUSTOMER").length,
    },
    {
      id: "TEAMS",
      label: "Teams",
      icon: Users,
      count: selectableUsers.length,
    },
    ...(me?.role === "ADMIN"
      ? [{ id: "CRON_JOBS" as WorkspaceTab, label: "Cron Jobs", icon: Clock3 }]
      : []),
    { id: "PROJECTS", label: "Projects", icon: Workflow },
    { id: "SETTINGS", label: "Settings", icon: Settings2 },
  ];

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const payload = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error("Invalid credentials");
        }
        return response.json() as Promise<{ token: string; user: User }>;
      });

      auth.setToken(payload.token);
      setMe(payload.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    }
  }

  async function initializeWhatsAppSession(force = false) {
    if (!auth.token) {
      return;
    }

    try {
      setQr(null);
      setQrRequested(true);
      setConnectionMessage(
        force
          ? "Resetting and requesting a fresh WhatsApp QR session."
          : "Requesting WhatsApp QR session.",
      );
      await api("/api/whatsapp/session/init", auth.token, {
        method: "POST",
        body: JSON.stringify({ force }),
      });
    } catch (initError) {
      setQrRequested(false);
      setError(
        initError instanceof Error
          ? initError.message
          : "Unable to initialize WhatsApp session",
      );
      setConnectionMessage("Session initialization failed.");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const leadId = Number(event.active.id);
    const destinationStage = event.over?.id as string | undefined;

    if (!auth.token || !destinationStage) {
      return;
    }

    const currentLead = leads.find((lead) => lead.id === leadId);

    if (!currentLead) {
      return;
    }

    const nextStatus = destinationStage === "CUSTOMER" ? "CUSTOMER" : "LEAD";
    const nextPipelineStage =
      destinationStage === "CUSTOMER"
        ? currentLead.pipelineStage
        : normalizePipelineStage(destinationStage);

    if (
      currentLead.status === nextStatus &&
      (nextStatus === "CUSTOMER" || normalizePipelineStage(currentLead.pipelineStage) === nextPipelineStage)
    ) {
      return;
    }

    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: nextStatus,
              pipelineStage: nextPipelineStage,
            }
          : lead,
      ),
    );

    if (selectedLead?.id === leadId) {
      setSelectedLead((current) =>
        current
          ? {
              ...current,
              status: nextStatus,
              pipelineStage: nextPipelineStage,
            }
          : current,
      );
    }

    await api(`/api/leads/${leadId}`, auth.token, {
      method: "PATCH",
      body: JSON.stringify({
        status: nextStatus,
        pipelineStage: nextPipelineStage,
      }),
    });
  }

  async function createLead(event: React.FormEvent) {
    event.preventDefault();
    if (!auth.token) {
      return;
    }

    await api<{ lead: Lead }>("/api/leads", auth.token, {
      method: "POST",
      body: JSON.stringify({
        name: leadForm.name,
        fullName: leadForm.fullName || null,
        phone: buildPhoneNumber(leadForm.phoneCountryCode, leadForm.phone),
        email: leadForm.email || null,
        status: leadForm.status,
        assignedToId: Number(leadForm.assignedToId),
        pipelineStage: leadForm.pipelineStage || "NEW",
        sourceCreatedTime: leadForm.sourceCreatedTime
          ? new Date(leadForm.sourceCreatedTime).toISOString()
          : null,
        externalLeadId: leadForm.externalLeadId || null,
        adId: leadForm.adId || null,
        adName: leadForm.adName || null,
        adsetId: leadForm.adsetId || null,
        adsetName: leadForm.adsetName || null,
        campaignId: leadForm.campaignId || null,
        campaignName: leadForm.campaignName || null,
        formId: leadForm.formId || null,
        formName: leadForm.formName || null,
        city: leadForm.city || null,
        budget: leadForm.budget || null,
        preferredLocation: leadForm.preferredLocation || null,
        customDisclaimerResponses: leadForm.customDisclaimerResponses || null,
        isOrganic:
          leadForm.isOrganic === "" ? null : leadForm.isOrganic === "true",
        platform: leadForm.platform || null,
      }),
    });

    setShowLeadForm(false);
    setLeadForm(createEmptyLeadForm());
    await loadData();
  }

  async function createTeamMember(event: React.FormEvent) {
    event.preventDefault();

    if (!auth.token) {
      return;
    }

    await api<{ user: User }>("/api/users", auth.token, {
      method: "POST",
      body: JSON.stringify({
        ...teamForm,
        phone: buildPhoneNumber(teamForm.phoneCountryCode, teamForm.phone),
        profileImageUrl: teamForm.profileImageUrl || "",
        assignments: teamForm.assignments.filter(
          (assignment) => assignment.departmentName.trim() && assignment.positionTitle.trim(),
        ),
      }),
    });

    setShowTeamForm(false);
    setTeamForm({
      name: "",
      email: "",
      phoneCountryCode: "+91",
      phone: "",
      profileImageUrl: "",
      password: "",
      role: "USER",
      assignments: organizationDepartments.length ? [{ departmentName: "", positionTitle: "" }] : [],
    });
    await loadData();
  }

  async function updateLeadRow(
    leadId: number,
    patch: Partial<Pick<Lead, "status" | "pipelineStage">>,
  ) {
    if (!auth.token) {
      return;
    }

    const normalizedPatch: Partial<Pick<Lead, "status" | "pipelineStage">> = {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.pipelineStage
        ? { pipelineStage: normalizePipelineStage(patch.pipelineStage) }
        : {}),
    };

    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, ...normalizedPatch } : lead,
      ),
    );

    if (selectedLead?.id === leadId) {
      setSelectedLead((current) =>
        current ? { ...current, ...normalizedPatch } : current,
      );
    }

    try {
      await api(`/api/leads/${leadId}`, auth.token, {
        method: "PATCH",
        body: JSON.stringify(normalizedPatch),
      });
    } catch (updateError) {
      await loadData();
      setError(updateError instanceof Error ? updateError.message : "Failed to update lead");
    }
  }

  async function sendMorningSummary() {
    if (!auth.token) {
      return;
    }

    setSendingSummary(true);

    try {
      await api("/api/dashboard/send-summary", auth.token, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setConnectionMessage("Morning briefing sent to WhatsApp.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send summary");
    } finally {
      setSendingSummary(false);
    }
  }

  function downloadBlob(filename: string, content: BlobPart, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function getLeadImportSampleRows() {
    return [
      {
        created_time: "2026-03-21T09:30:00Z",
        id: "fb-lead-1001",
        ad_id: "ad_001",
        ad_name: "Downtown Buyer Campaign",
        adset_id: "adset_001",
        adset_name: "Metro Audience",
        campaign_id: "cmp_001",
        campaign_name: "Q2 Demand Gen",
        form_id: "form_001",
        form_name: "Property Inquiry",
        name: "Acme Holdings",
        full_name: "Aarav Mehta",
        phone: "919999999999",
        email: "ops@acme.test",
        city: "Mumbai",
        "What is your budget?": "80L - 1Cr",
        "Preferred location": "Bandra West",
        custom_disclaimer_responses: "Agreed",
        is_organic: false,
        platform: "facebook",
        assignedToEmail: selectableUsers[0]?.email ?? me?.email ?? "admin@crm.local",
        pipelineStage: "NEW",
      },
      {
        created_time: "2026-03-21T10:00:00Z",
        id: "fb-lead-1002",
        ad_id: "ad_002",
        ad_name: "Tech Corridor Expansion",
        adset_id: "adset_002",
        adset_name: "Investor Segment",
        campaign_id: "cmp_002",
        campaign_name: "High Intent Prospects",
        form_id: "form_002",
        form_name: "Site Visit Form",
        name: "Northwind Labs",
        full_name: "Nisha Rao",
        phone: "918888888888",
        email: "hello@northwind.test",
        city: "Bengaluru",
        "What is your budget?": "1Cr+",
        "Preferred location": "Whitefield",
        custom_disclaimer_responses: "Agreed",
        is_organic: true,
        platform: "instagram",
        assignedToEmail: selectableUsers[0]?.email ?? me?.email ?? "admin@crm.local",
        pipelineStage: "WARM",
      },
    ];
  }

  async function downloadLeadSample(format: "csv" | "xlsx") {
    const rows = getLeadImportSampleRows();
    const XLSX = await loadXlsx();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      downloadBlob("lead-import-sample.csv", csv, "text/csv;charset=utf-8");
      return;
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, "lead-import-sample.xlsx");
  }

  function normalizeImportRows(rows: Record<string, unknown>[]) {
    const optionalText = (value: unknown) => {
      const normalized = String(value ?? "").trim();
      return normalized || undefined;
    };

    return rows
      .map((row) => {
        const normalized = new Map<string, unknown>();

        for (const [key, value] of Object.entries(row)) {
          normalized.set(key.replace(/[\s_]+/g, "").toLowerCase(), value);
        }

        const fullName =
          optionalText(normalized.get("fullname")) ?? optionalText(normalized.get("name"));
        const phone = optionalText(normalized.get("phone") ?? normalized.get("phonenumber"))
          ?.replace(/^p:/i, "");

        return {
          name: optionalText(normalized.get("name")) ?? fullName,
          phone,
          email: optionalText(normalized.get("email")) ?? "",
          assignedToEmail: optionalText(normalized.get("assignedtoemail")) ?? "",
          assignedToId: Number(normalized.get("assignedtoid") ?? 0) || undefined,
          pipelineStage: optionalText(normalized.get("pipelinestage")) ?? "NEW",
          createdTime: optionalText(normalized.get("created_time") ?? normalized.get("createdtime")) ?? "",
          externalLeadId: optionalText(normalized.get("id") ?? normalized.get("externalleadid")) ?? "",
          adId: optionalText(normalized.get("ad_id") ?? normalized.get("adid")) ?? "",
          adName: optionalText(normalized.get("ad_name") ?? normalized.get("adname")) ?? "",
          adsetId: optionalText(normalized.get("adset_id") ?? normalized.get("adsetid")) ?? "",
          adsetName: optionalText(normalized.get("adset_name") ?? normalized.get("adsetname")) ?? "",
          campaignId: optionalText(normalized.get("campaign_id") ?? normalized.get("campaignid")) ?? "",
          campaignName: optionalText(normalized.get("campaign_name") ?? normalized.get("campaignname")) ?? "",
          formId: optionalText(normalized.get("form_id") ?? normalized.get("formid")) ?? "",
          formName: optionalText(normalized.get("form_name") ?? normalized.get("formname")) ?? "",
          fullName: fullName ?? "",
          city: optionalText(normalized.get("city")) ?? "",
          budget: optionalText(normalized.get("whatisyourbudget?") ?? normalized.get("budget")) ?? "",
          preferredLocation: optionalText(normalized.get("preferredlocation")) ?? "",
          customDisclaimerResponses:
            optionalText(
              normalized.get("custom_disclaimer_responses") ??
                normalized.get("customdisclaimerresponses"),
            ) ?? "",
          isOrganic:
            String(normalized.get("is_organic") ?? normalized.get("isorganic") ?? "")
              .trim()
              .toLowerCase() === "true"
              ? true
              : String(normalized.get("is_organic") ?? normalized.get("isorganic") ?? "")
                    .trim()
                    .toLowerCase() === "false"
                ? false
                : undefined,
          platform: (optionalText(normalized.get("platform")) ?? "")
            .replace(/^ig$/i, "instagram")
            .replace(/^fb$/i, "facebook"),
        };
      })
      .filter((row) => (row.name || row.fullName) && row.phone);
  }

  async function handleImportLeads(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !auth.token) {
      return;
    }

    setImportingLeads(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      let rows: Record<string, unknown>[] = [];

      try {
        const XLSX = await loadXlsx();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          defval: "",
        });
      } catch {
        if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
          throw new Error("Unsupported file format.");
        }

        rows = parseDelimitedRows(decodeTextFile(buffer));
      }

      const normalizedRows = normalizeImportRows(rows);

      if (!normalizedRows.length) {
        throw new Error("The selected file does not contain any valid lead rows.");
      }

      const result = await api<{ imported: number; skipped: number; total: number }>(
        "/api/leads/import",
        auth.token,
        {
          method: "POST",
          body: JSON.stringify({ rows: normalizedRows }),
        },
      );

      await loadData();
      setConnectionMessage(
        `Lead import complete: ${result.imported} imported, ${result.skipped} skipped.`,
      );
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "Failed to import leads.",
      );
    } finally {
      setImportingLeads(false);
      event.target.value = "";
    }
  }

  async function saveAction() {
    if (!auth.token || !selectedLead) {
      return;
    }

    await api("/api/actions", auth.token, {
      method: "POST",
      body: JSON.stringify({
        leadId: selectedLead.id,
        title: actionForm.title,
        notes: actionForm.notes,
        scheduledAt: new Date(actionForm.scheduledAt).toISOString(),
      }),
    });

    setActionForm({ title: "", notes: "", scheduledAt: "" });
    await openLead(selectedLead.id);
    await loadData();
  }

  async function saveActionFollowUp(actionId: number) {
    if (!auth.token || !selectedLead) {
      return;
    }

    const form = actionFollowUpForms[actionId];

    if (!form || form.outcomeStatus === "PENDING") {
      setConnectionMessage("Choose a follow-up outcome before saving the action.");
      return;
    }

    if (
      (form.nextActionTitle.trim() && !form.nextActionScheduledAt) ||
      (!form.nextActionTitle.trim() && form.nextActionScheduledAt)
    ) {
      setConnectionMessage("Next action title and date are both required together.");
      return;
    }

    setSavingActionFollowUpId(actionId);

    try {
      await api(`/api/actions/${actionId}`, auth.token, {
        method: "PATCH",
        body: JSON.stringify({
          outcomeStatus: form.outcomeStatus,
          nextActionTitle: form.nextActionTitle.trim() || null,
          nextActionNotes: form.nextActionNotes.trim() || null,
          nextActionScheduledAt: form.nextActionScheduledAt
            ? new Date(form.nextActionScheduledAt).toISOString()
            : null,
        }),
      });

      await openLead(selectedLead.id);
      await loadData();
      setConnectionMessage("Action follow-up saved.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to save action follow-up");
    } finally {
      setSavingActionFollowUpId(null);
    }
  }

  async function createProject(event?: React.FormEvent) {
    event?.preventDefault();

    if (!auth.token || !selectedLead) {
      return;
    }

    await api("/api/projects", auth.token, {
      method: "POST",
      body: JSON.stringify({
        leadId: selectedLead.status === "LEAD" ? selectedLead.id : null,
        customerId: selectedLead.status === "CUSTOMER" ? selectedLead.id : null,
        title: projectForm.title,
        status: projectForm.status,
        notes: projectForm.notes || null,
      }),
    });

    setProjectForm({
      title: "",
      status: "PLANNING",
      notes: "",
    });
    await openLead(selectedLead.id);
    await loadData();
  }

  async function createAction(event: React.FormEvent) {
    event.preventDefault();
    await saveAction();
  }

  async function persistLeadDetails() {
    if (!auth.token || !selectedLead || !leadEditForm) {
      return;
    }

    const payload = {
      name: leadEditForm.name,
      fullName: leadEditForm.fullName || null,
      phone: buildPhoneNumber(leadEditForm.phoneCountryCode, leadEditForm.phone),
      email: leadEditForm.email || null,
      status: leadEditForm.status,
      pipelineStage: leadEditForm.pipelineStage,
      assignedToId: Number(leadEditForm.assignedToId),
      sourceCreatedTime: leadEditForm.sourceCreatedTime
        ? new Date(leadEditForm.sourceCreatedTime).toISOString()
        : null,
      externalLeadId: leadEditForm.externalLeadId || null,
      adId: leadEditForm.adId || null,
      adName: leadEditForm.adName || null,
      adsetId: leadEditForm.adsetId || null,
      adsetName: leadEditForm.adsetName || null,
      campaignId: leadEditForm.campaignId || null,
      campaignName: leadEditForm.campaignName || null,
      formId: leadEditForm.formId || null,
      formName: leadEditForm.formName || null,
      city: leadEditForm.city || null,
      budget: leadEditForm.budget || null,
      preferredLocation: leadEditForm.preferredLocation || null,
      customDisclaimerResponses: leadEditForm.customDisclaimerResponses || null,
      isOrganic:
        leadEditForm.isOrganic === ""
          ? null
          : leadEditForm.isOrganic === "true",
      platform: leadEditForm.platform || null,
    };

    const response = await api<{ lead: Lead }>(`/api/leads/${selectedLead.id}`, auth.token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    setSelectedLead(response.lead);
    setLeads((current) =>
      current.map((lead) => (lead.id === response.lead.id ? { ...lead, ...response.lead } : lead)),
    );
    await loadData();
    setConnectionMessage("Lead details saved.");
  }

  async function saveLeadDetails(event: React.FormEvent) {
    event.preventDefault();
    await persistLeadDetails();
  }

  async function requestTransfer(event?: React.FormEvent) {
    event?.preventDefault();
    if (!auth.token || !selectedLead) {
      return;
    }

    if (!transferToUserId) {
      setConnectionMessage("Choose a teammate before sending the transfer request.");
      return;
    }

    setSubmittingTransfer(true);

    try {
      await api("/api/transfers/request", auth.token, {
        method: "POST",
        body: JSON.stringify({
          leadId: selectedLead.id,
          toUserId: Number(transferToUserId),
        }),
      });

      setTransferToUserId("");
      await openLead(selectedLead.id);
      await loadData();
      setConnectionMessage(
        me?.role === "ADMIN"
          ? "Lead ownership updated."
          : "Transfer request sent for admin approval.",
      );
    } finally {
      setSubmittingTransfer(false);
    }
  }

  async function submitBulkTransfer() {
    if (!auth.token || selectedLeadIds.length === 0) {
      return;
    }

    const token = auth.token;

    if (!bulkTransferToUserId) {
      setError("Choose a teammate before sending the transfer request.");
      return;
    }

    setSubmittingBulkTransfer(true);

    try {
      const results = await Promise.allSettled(
        selectedLeadIds.map((leadId) =>
          api("/api/transfers/request", token, {
            method: "POST",
            body: JSON.stringify({
              leadId,
              toUserId: Number(bulkTransferToUserId),
            }),
          }),
        ),
      );

      const succeeded = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - succeeded;
      const targetUser = selectableUsers.find((user) => user.id === Number(bulkTransferToUserId));

      await loadData();

      if (succeeded > 0) {
        setConnectionMessage(
          failed > 0
            ? `${succeeded} leads sent to ${targetUser?.email ?? "the selected teammate"}, ${failed} failed.`
            : `${succeeded} leads sent to ${targetUser?.email ?? "the selected teammate"}.`,
        );
      }

      if (failed > 0) {
        const firstFailure = results.find(
          (result): result is PromiseRejectedResult => result.status === "rejected",
        );
        setError(
          firstFailure?.reason instanceof Error
            ? firstFailure.reason.message
            : `${failed} transfer requests failed.`,
        );
      } else {
        setError(null);
      }

      setSelectedLeadIds([]);
      setBulkTransferToUserId("");
      setShowBulkTransferModal(false);
    } finally {
      setSubmittingBulkTransfer(false);
    }
  }

  async function resolveTransfer(transferId: number, action: "accept" | "reject") {
    if (!auth.token) {
      return;
    }

    setResolvingTransferId(transferId);

    try {
      await api(`/api/transfers/${transferId}/${action}`, auth.token, {
        method: "POST",
      });
      await loadData();
      setConnectionMessage(
        action === "accept" ? "Transfer accepted." : "Transfer rejected.",
      );
    } finally {
      setResolvingTransferId(null);
    }
  }

  function logout() {
    auth.setToken(null);
    setMe(null);
    setDashboard(null);
    setLeads([]);
    setSelectedLead(null);
  }

  if (!auth.ready) {
    return (
      <main className="min-h-dvh px-6 py-10 text-stone-950">
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-6xl items-center justify-center rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_24px_80px_rgba(23,18,13,0.08)] backdrop-blur-xl">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
              Restoring session
            </p>
            <p className="mt-4 text-sm text-stone-600">
              Loading your workspace state and route context.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!auth.token || !me) {
    return (
      <main className="min-h-dvh px-6 py-10 text-stone-950">
        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[0_24px_80px_rgba(23,18,13,0.08)] backdrop-blur-xl lg:p-12">
            <BrandMark />
            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-tight">
              A keyboard-first sales command center with a hard WhatsApp dependency.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-700">
              Every rep’s dashboard is gated by live device health. If a phone disconnects,
              the CRM locks down until the QR pairing flow is restored.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Connection Shield", "Live QR pairing over Socket.io"],
                ["Morning Brief", "Visual mirror of the 9 AM WhatsApp sweep"],
                ["Transfer Ledger", "Atomic reassignment with admin override"],
              ].map(([title, description]) => (
                <article
                  key={title}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-white/75 p-4"
                >
                  <p className="text-sm font-medium text-stone-950">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-8 text-stone-50 shadow-[0_24px_80px_rgba(23,18,13,0.18)] lg:p-10">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-sm uppercase tracking-[0.26em] text-amber-300">
                <Shield className="h-4 w-4" />
                Access Gateway
              </div>
              <BrandMark compact className="opacity-95 [&_p:last-child]:text-stone-100 [&_p:first-child]:text-amber-300" />
            </div>
            <h2 className="mt-4 text-3xl font-semibold">Sign in</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Demo credentials are seeded automatically on the backend.
            </p>
            <form className="mt-8 space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-2 block text-sm text-stone-300">Email</span>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 outline-none ring-0 transition focus:border-amber-300"
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-stone-300">Password</span>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 outline-none ring-0 transition focus:border-amber-300"
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <button
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-amber-300 px-4 font-medium text-stone-950 transition hover:translate-y-[-1px]"
                type="submit"
              >
                Enter the command center
              </button>
            </form>
            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
            <div className="mt-10 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 font-mono text-xs text-stone-300">
              <p>`admin@crm.local / admin123`</p>
              <p className="mt-2">`rep@crm.local / rep123`</p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh px-4 py-4 text-stone-950 md:px-6 md:py-6">
      <div
        className={clsx(
          "mx-auto max-w-[1600px] transition duration-300",
          me.needsReauth && "pointer-events-none blur-[10px] saturate-50",
        )}
      >
        <header className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] px-5 py-4 shadow-[0_20px_70px_rgba(23,18,13,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <BrandMark compact />
              <div>
                <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.32em] text-teal-700">
                  <Radar className="h-4 w-4" />
                  Live Command Center
                </div>
                <h1 className="mt-3 text-3xl font-semibold">
                  {me.role === "ADMIN" ? "Founder overview" : "Sales dashboard"}
                </h1>
                <p className="mt-2 text-sm text-stone-600">
                  Keyboard shortcuts: `N` new lead, `Esc` close overlays.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard
                icon={Columns3}
                label="Leads"
                value={dashboard?.metrics.totalLeads ?? 0}
                onClick={() => setActiveTab("LEADS")}
              />
              <MetricCard
                icon={CheckCircle2}
                label="Customers"
                value={dashboard?.metrics.customers ?? 0}
                onClick={() => setActiveTab("CUSTOMERS")}
              />
              <MetricCard
                icon={Clock3}
                label="Due Today"
                value={dashboard?.metrics.dueToday ?? 0}
                onClick={() => setActiveTab("DASHBOARD")}
              />
              <MetricCard
                icon={ArrowRightLeft}
                label="Pending Transfers"
                value={dashboard?.metrics.pendingTransfers ?? 0}
                onClick={() => setShowTransfersDrawer(true)}
              />
            </div>
          </div>
        </header>

        <section
          className={clsx(
            "mt-6 grid gap-6",
            sidebarCompact
              ? "xl:grid-cols-[96px_minmax(0,1fr)]"
              : "xl:grid-cols-[280px_minmax(0,1fr)]",
          )}
        >
          <aside
            className={clsx(
              "rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] backdrop-blur-xl transition-all duration-300",
              sidebarCompact ? "space-y-3 p-3" : "space-y-4 p-5",
            )}
          >
            <div className="flex justify-end">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/80 text-stone-700 transition hover:bg-white"
                onClick={() => setSidebarCollapsed((current) => !current)}
                type="button"
                aria-label={sidebarCompact ? "Expand menu sidebar" : "Collapse menu sidebar"}
                title={sidebarCompact ? "Expand menu sidebar" : "Collapse menu sidebar"}
              >
                {sidebarCompact ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="rounded-[1.5rem] bg-stone-950 p-5 text-stone-50">
              <div
                className={clsx(
                  "flex items-center justify-between",
                  sidebarCompact && "flex-col gap-3 text-center",
                )}
              >
                <div>
                  {sidebarCompact ? (
                    <>
                      <div className="mx-auto">
                        <UserAvatar user={me} size="sm" />
                      </div>
                      <p className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-stone-300">
                        {me.role}
                      </p>
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <UserAvatar user={me} />
                      <div>
                        <p className="text-sm font-medium">{getUserDisplayName(me)}</p>
                        <p className="mt-1 text-sm text-stone-300">{me.email}</p>
                        <p className="mt-1 font-mono text-xs uppercase tracking-[0.24em] text-stone-400">
                          {me.role}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="rounded-full border border-white/10 p-2 text-stone-300"
                  onClick={logout}
                  aria-label="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
              <div className={clsx("mt-5 text-sm", sidebarCompact ? "space-y-2" : "space-y-3")}>
                <StatusRow
                  icon={me.whatsappConnected ? CheckCircle2 : AlertTriangle}
                  label={sidebarCompact ? "WhatsApp" : "WhatsApp status"}
                  value={me.whatsappConnected ? "Connected" : "Disconnected"}
                  tone={me.whatsappConnected ? "ok" : "warn"}
                  compact={sidebarCompact}
                />
                <StatusRow
                  icon={Radar}
                  label={sidebarCompact ? "Socket" : "Socket bridge"}
                  value={socketStatus}
                  tone={socketStatus === "live" ? "ok" : "neutral"}
                  compact={sidebarCompact}
                />
              </div>
            </div>

            {!sidebarCompact ? (
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 font-medium text-white transition hover:translate-y-[-1px]"
                onClick={() =>
                  activeTab === "TEAMS" ? setShowTeamForm(true) : setShowLeadForm(true)
                }
              >
                <Plus className="h-4 w-4" />
                {activeTab === "TEAMS" ? "Add team" : "New lead"}
              </button>
            ) : null}

            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-3">
              {!sidebarCompact ? (
                <div className="flex items-center gap-2 px-2 pb-3 text-sm font-medium">
                  <LayoutDashboard className="h-4 w-4 text-teal-700" />
                  Workspace
                </div>
              ) : null}
              <div className={clsx(sidebarCompact ? "space-y-3" : "space-y-2")}>
                {workspaceItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      className={clsx(
                        "transition",
                        activeTab === item.id
                          ? "bg-stone-950 text-white"
                          : "border border-[var(--line)] bg-white text-stone-700",
                        sidebarCompact
                          ? "flex h-12 w-full items-center justify-center rounded-2xl"
                          : "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm",
                      )}
                      onClick={() => setActiveTab(item.id)}
                      aria-label={item.label}
                      title={item.label}
                    >
                      <span className={clsx("flex items-center", sidebarCompact ? "" : "gap-3")}>
                        <Icon className="h-4 w-4" />
                        {!sidebarCompact ? item.label : null}
                      </span>
                      {!sidebarCompact && typeof item.count === "number" ? (
                        <span className="font-mono text-xs uppercase tracking-[0.2em]">
                          {item.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {!sidebarCompact ? (
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-teal-700" />
                Team availability
              </div>
              <div className="mt-4 space-y-3">
                {teammates.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{getUserDisplayName(user)}</p>
                      <p className="text-xs text-stone-500">{user.email}</p>
                    </div>
                    <span
                      className={clsx(
                        "rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.2em]",
                        user.whatsappConnected
                          ? "bg-teal-100 text-teal-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {user.whatsappConnected ? "Live" : "Needs QR"}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            ) : null}
          </aside>

          <section className="min-w-0 space-y-6">
            {activeTab === "PROJECTS" ? (
              <section
                className={clsx(
                  "grid gap-6",
                  projectFocusMode ? "grid-cols-1" : "xl:grid-cols-[320px_minmax(0,1fr)]",
                )}
              >
                {!projectFocusMode ? (
                  <aside className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                        Projects
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">Delivery workspace</h2>
                    </div>
                    <button
                      className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
                      onClick={() => void loadProjects(selectedProject?.id)}
                      type="button"
                    >
                      Refresh
                    </button>
                  </div>

                  <label className="mt-5 flex h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4">
                    <Search className="h-4 w-4 text-stone-500" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Search projects by title, key, owner"
                      value={projectSearch}
                      onChange={(event) => setProjectSearch(event.target.value)}
                    />
                  </label>

                  <div className="mt-4 flex gap-2">
                    <button
                      className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-700 px-4 text-sm font-medium text-white"
                      onClick={() => setShowProjectForm(true)}
                      type="button"
                    >
                      <Plus className="h-4 w-4" />
                      New project
                    </button>
                    <button
                      className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => setShowTaskForm(true)}
                      type="button"
                      disabled={!selectedProject}
                    >
                      <Plus className="h-4 w-4" />
                      New task
                    </button>
                  </div>

                  <div className="mt-6 space-y-3">
                    {filteredProjects.length ? (
                      filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          className={clsx(
                            "w-full rounded-[1.5rem] border px-4 py-4 text-left transition",
                            selectedProject?.id === project.id
                              ? "border-stone-950 bg-stone-950 text-white shadow-[0_20px_40px_rgba(23,18,13,0.12)]"
                              : "border-[var(--line)] bg-white/80 text-stone-950 hover:border-teal-200 hover:bg-white",
                          )}
                          onClick={() => void openProjectWorkspace(project.id)}
                          type="button"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-base font-semibold">{project.title}</p>
                              <p
                                className={clsx(
                                  "mt-1 text-xs uppercase tracking-[0.18em]",
                                  selectedProject?.id === project.id
                                    ? "text-stone-300"
                                    : "text-stone-500",
                                )}
                              >
                                {project.key || "No key"}
                              </p>
                            </div>
                            <span
                              className={clsx(
                                "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                                selectedProject?.id === project.id
                                  ? "bg-white/10 text-white"
                                  : "bg-stone-100 text-stone-800",
                              )}
                            >
                              {String(project.status).replaceAll("_", " ")}
                            </span>
                          </div>
                          <div
                            className={clsx(
                              "mt-4 grid grid-cols-3 gap-3 text-xs uppercase tracking-[0.16em]",
                              selectedProject?.id === project.id
                                ? "text-stone-300"
                                : "text-stone-500",
                            )}
                          >
                            <div>
                              <p>{project.progress ?? 0}%</p>
                              <p className="mt-1">Progress</p>
                            </div>
                            <div>
                              <p>{project.tasks?.length ?? 0}</p>
                              <p className="mt-1">Tasks</p>
                            </div>
                            <div>
                              <p>{project.overdueTaskCount ?? 0}</p>
                              <p className="mt-1">Overdue</p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                        No projects match this search yet.
                      </div>
                    )}
                  </div>
                  </aside>
                ) : null}

                <div className="space-y-6">
                  <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-6 backdrop-blur-xl">
                    {selectedProject ? (
                      <>
                        <div className="mb-5 flex items-center justify-between gap-3">
                          <button
                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-700"
                            onClick={() => setSelectedProject(null)}
                            type="button"
                          >
                            <ChevronRight className="h-4 w-4 rotate-180" />
                            All projects
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-700"
                            onClick={() => setShowTaskForm(true)}
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                            New task
                          </button>
                        </div>

                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                              Project detail
                            </p>
                            <h2 className="mt-3 text-3xl font-semibold">{selectedProject.title}</h2>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                              {selectedProject.description || "No project description added yet."}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PROJECT_STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                className={clsx(
                                  "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                                  selectedProject.status === option.value
                                    ? "border-stone-950 bg-stone-950 text-white"
                                    : "border-[var(--line)] bg-white text-stone-700",
                                )}
                                onClick={() =>
                                  setSelectedProject((current) =>
                                    current
                                      ? { ...current, status: option.value }
                                      : current,
                                  )
                                }
                                type="button"
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-4">
                          <ProjectMetricCard
                            label="Progress"
                            value={`${selectedProject.progress ?? 0}%`}
                            hint={`${projectTaskCounts.done} of ${projectTaskCounts.total} done`}
                          />
                          <ProjectMetricCard
                            label="In progress"
                            value={String(projectTaskCounts.inProgress)}
                            hint="Tasks currently being worked"
                          />
                          <ProjectMetricCard
                            label="Overdue"
                            value={String(projectTaskCounts.overdue)}
                            hint="Needs attention"
                          />
                          <ProjectMetricCard
                            label="Due date"
                            value={
                              selectedProject.dueDate
                                ? formatDateTimeWithSettings(
                                    selectedProject.dueDate,
                                    settingsForm.timeZone,
                                    settingsForm.language,
                                  )
                                : "Not set"
                            }
                            hint={selectedProject.owner?.email || "No owner"}
                          />
                        </div>

                        <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_300px]">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { id: "OVERVIEW", label: "Overview" },
                                { id: "BOARD", label: "Board" },
                                { id: "LIST", label: "List" },
                                { id: "CALENDAR", label: "Calendar" },
                                { id: "GANTT", label: "Gantt" },
                                { id: "ACTIVITY", label: "Activity" },
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  className={clsx(
                                    "rounded-2xl border px-4 py-2 text-sm font-medium transition",
                                    projectView === tab.id
                                      ? "border-stone-950 bg-stone-950 text-white"
                                      : "border-[var(--line)] bg-white text-stone-700",
                                  )}
                                  onClick={() =>
                                    setProjectView(
                                      tab.id as
                                        | "OVERVIEW"
                                        | "BOARD"
                                        | "LIST"
                                        | "CALENDAR"
                                        | "GANTT"
                                        | "ACTIVITY",
                                    )
                                  }
                                  type="button"
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            {projectView === "OVERVIEW" ? (
                              <form className="mt-5 grid gap-4" onSubmit={saveProjectDetails}>
                                <div className="grid gap-4 md:grid-cols-2">
                                  <FormInput
                                    label="Project title"
                                    value={selectedProject.title}
                                    onChange={(value) =>
                                      setSelectedProject((current) =>
                                        current ? { ...current, title: value } : current,
                                      )
                                    }
                                  />
                                  <FormInput
                                    label="Project key"
                                    value={selectedProject.key ?? ""}
                                    onChange={(value) =>
                                      setSelectedProject((current) =>
                                        current ? { ...current, key: value } : current,
                                      )
                                    }
                                  />
                                  <DateTimeInput
                                    label="Due date"
                                    value={toDateTimeLocal(selectedProject.dueDate)}
                                    onChange={(value) =>
                                      setSelectedProject((current) =>
                                        current ? { ...current, dueDate: value || null } : current,
                                      )
                                    }
                                  />
                                  <SelectInput
                                    label="Owner"
                                    value={String(selectedProject.ownerId ?? "")}
                                    onChange={(value) =>
                                      setSelectedProject((current) =>
                                        current
                                          ? {
                                              ...current,
                                              ownerId: Number(value),
                                              owner:
                                                selectableUsers.find(
                                                  (user) => user.id === Number(value),
                                                ) ?? current.owner,
                                            }
                                          : current,
                                      )
                                    }
                                    options={selectableUsers.map((user) => ({
                                      label: getUserDisplayName(user),
                                      value: String(user.id),
                                    }))}
                                  />
                                </div>
                                <TextAreaInput
                                  label="Description"
                                  value={selectedProject.description ?? ""}
                                  onChange={(value) =>
                                    setSelectedProject((current) =>
                                      current ? { ...current, description: value } : current,
                                    )
                                  }
                                />
                                <TextAreaInput
                                  label="Notes"
                                  value={selectedProject.notes ?? ""}
                                  onChange={(value) =>
                                    setSelectedProject((current) =>
                                      current ? { ...current, notes: value } : current,
                                    )
                                  }
                                />
                                <div className="rounded-[1.5rem] border border-[var(--line)] bg-stone-50 p-4">
                                  <div className="flex items-center justify-between gap-4">
                                    <div>
                                      <p className="text-sm font-medium text-stone-950">
                                        Project team
                                      </p>
                                      <p className="mt-1 text-sm text-stone-500">
                                        Choose who should collaborate inside this delivery workspace.
                                      </p>
                                    </div>
                                  </div>
                                  <label className="mt-4 flex h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4">
                                    <Search className="h-4 w-4 text-stone-500" />
                                    <input
                                      className="w-full bg-transparent text-sm outline-none"
                                      placeholder="Search team members"
                                      value={projectTeamSearch}
                                      onChange={(event) => setProjectTeamSearch(event.target.value)}
                                    />
                                  </label>
                                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {filteredProjectTeamOptions.map((user) => {
                                      const checked =
                                        selectedProject.members?.some(
                                          (member) => member.userId === user.id,
                                        ) ?? false;
                                      const isOwner = selectedProject.ownerId === user.id;

                                      return (
                                        <label
                                          key={`project-member-${user.id}`}
                                          className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3"
                                        >
                                          <input
                                            className="mt-1 h-4 w-4 rounded border-[var(--line)]"
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                              setSelectedProject((current) => {
                                                if (!current) {
                                                  return current;
                                                }

                                                const members = current.members ?? [];

                                                return {
                                                  ...current,
                                                  members: event.target.checked
                                                    ? members.some((member) => member.userId === user.id)
                                                      ? members
                                                      : [
                                                          ...members,
                                                          {
                                                            id: Date.now() + user.id,
                                                            userId: user.id,
                                                            role: isOwner
                                                              ? "PROJECT_OWNER"
                                                              : "MEMBER",
                                                            user: {
                                                              id: user.id,
                                                              name: user.name,
                                                              email: user.email,
                                                            },
                                                          },
                                                        ]
                                                    : members.filter((member) => member.userId !== user.id),
                                                };
                                              })
                                            }
                                          />
                                          <div>
                                            <p className="text-sm font-medium text-stone-950">
                                              {getUserDisplayName(user)}
                                            </p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                                              {isOwner ? "Project owner" : user.role}
                                            </p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                    {filteredProjectTeamOptions.length === 0 ? (
                                      <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-6 text-sm text-stone-500 md:col-span-2">
                                        No team members match your search.
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                <button
                                  className="h-12 rounded-2xl bg-stone-950 px-5 text-white"
                                  type="submit"
                                >
                                  Save Project
                                </button>
                              </form>
                            ) : null}

                            {projectView === "BOARD" ? (
                              <div className="mt-5">
                                <DndContext
                                  sensors={sensors}
                                  onDragEnd={(event) => {
                                    const destinationStatus = event.over?.id as TaskStatus | undefined;
                                    const taskId = Number(event.active.id);
                                    if (!destinationStatus || Number.isNaN(taskId)) {
                                      return;
                                    }

                                    const sourceTask = selectedProject.tasks?.find(
                                      (task) => task.id === taskId,
                                    );

                                    if (!sourceTask || sourceTask.status === destinationStatus) {
                                      return;
                                    }

                                    void moveProjectTask(taskId, destinationStatus, sourceTask.sortOrder);
                                  }}
                                >
                                  <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                                    {groupedProjectTasks.map((column) => (
                                      <KanbanColumn
                                        key={column.value}
                                        id={column.value}
                                        title={column.label}
                                        count={column.tasks.length}
                                      >
                                        {column.tasks.length ? (
                                          column.tasks.map((task) => (
                                            <ProjectTaskCard
                                              key={task.id}
                                              task={task}
                                              onOpen={() => void openProjectTask(task.id)}
                                            />
                                          ))
                                        ) : (
                                          <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-6 text-sm text-stone-500">
                                            No tasks in {column.label.toLowerCase()}.
                                          </div>
                                        )}
                                      </KanbanColumn>
                                    ))}
                                  </div>
                                </DndContext>
                              </div>
                            ) : null}

                            {projectView === "LIST" ? (
                              <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/80">
                                <div className="grid grid-cols-[minmax(0,1.8fr)_140px_140px_180px_160px] gap-4 border-b border-[var(--line)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
                                  <span>Task</span>
                                  <span>Status</span>
                                  <span>Priority</span>
                                  <span>Assignee</span>
                                  <span>Due</span>
                                </div>
                                <div>
                                  {projectListTasks.length ? (
                                    projectListTasks.map((task) => (
                                      <button
                                        key={task.id}
                                        className="grid w-full grid-cols-[minmax(0,1.8fr)_140px_140px_180px_160px] gap-4 border-b border-[var(--line)] px-4 py-4 text-left transition hover:bg-stone-50"
                                        onClick={() => void openProjectTask(task.id)}
                                        type="button"
                                      >
                                        <div>
                                          <p className="font-medium text-stone-950">{task.title}</p>
                                          <p className="mt-1 text-sm text-stone-500">
                                            {task._count?.subtasks ?? 0} subtasks •{" "}
                                            {task._count?.comments ?? 0} comments
                                          </p>
                                        </div>
                                        <span className="text-sm text-stone-700">
                                          {task.status.replaceAll("_", " ")}
                                        </span>
                                        <span className="text-sm text-stone-700">{task.priority}</span>
                                        <span className="text-sm text-stone-700">
                                          {task.assignee ? getUserDisplayName(task.assignee) : "Unassigned"}
                                        </span>
                                        <span className="text-sm text-stone-700">
                                          {task.dueDate
                                            ? formatDateTimeWithSettings(
                                                task.dueDate,
                                                settingsForm.timeZone,
                                                settingsForm.language,
                                              )
                                            : "No due date"}
                                        </span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-4 py-8 text-sm text-stone-500">
                                      No tasks created yet.
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : null}

                            {projectView === "CALENDAR" ? (
                              <div className="mt-5">
                                <ProjectCalendarView
                                  tasks={projectListTasks}
                                  timeZone={settingsForm.timeZone}
                                  language={settingsForm.language}
                                  onOpenTask={(taskId) => void openProjectTask(taskId)}
                                />
                              </div>
                            ) : null}

                            {projectView === "GANTT" ? (
                              <div className="mt-5">
                                <ProjectGanttView
                                  project={selectedProject}
                                  tasks={projectListTasks}
                                  timeZone={settingsForm.timeZone}
                                  language={settingsForm.language}
                                  onOpenTask={(taskId) => void openProjectTask(taskId)}
                                />
                              </div>
                            ) : null}

                            {projectView === "ACTIVITY" ? (
                              <div className="mt-5 space-y-3">
                                {selectedProject.activities?.length ? (
                                  selectedProject.activities.map((activity) => (
                                    <div
                                      key={activity.id}
                                      className="rounded-[1.5rem] border border-[var(--line)] bg-white px-4 py-4"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div>
                                          <p className="text-sm font-medium text-stone-950">
                                            {activity.message}
                                          </p>
                                          <p className="mt-2 text-sm text-stone-500">
                                            {activity.actor
                                              ? getUserDisplayName(activity.actor)
                                              : "System"}
                                          </p>
                                        </div>
                                        <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                                          {formatDateTimeWithSettings(
                                            activity.createdAt,
                                            settingsForm.timeZone,
                                            settingsForm.language,
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white px-4 py-6 text-sm text-stone-500">
                                    No activity has been logged yet.
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>

                          <aside className="space-y-4">
                            <div className="rounded-[1.5rem] border border-[var(--line)] bg-stone-950 p-5 text-white">
                              <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">
                                My Tasks
                              </p>
                              <div className="mt-4 space-y-3">
                                {myTasks.length ? (
                                  myTasks.slice(0, 6).map((task) => (
                                    <button
                                      key={task.id}
                                      className="w-full rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
                                      onClick={() => {
                                        if (task.projectId !== selectedProject.id) {
                                          void openProjectWorkspace(task.projectId).then(() =>
                                            void openProjectTask(task.id),
                                          );
                                          return;
                                        }
                                        void openProjectTask(task.id);
                                      }}
                                      type="button"
                                    >
                                      <p className="text-sm font-medium">{task.title}</p>
                                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-300">
                                        {task.status.replaceAll("_", " ")} • {task.priority}
                                      </p>
                                    </button>
                                  ))
                                ) : (
                                  <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-stone-300">
                                    Nothing assigned right now.
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-5">
                              <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone-500">
                                Members
                              </p>
                              <div className="mt-4 space-y-3">
                                {selectedProject.members?.map((member) => (
                                  <div
                                    key={member.id}
                                    className="rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3"
                                  >
                                    <p className="text-sm font-medium text-stone-950">
                                      {getUserDisplayName(member.user)}
                                    </p>
                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                                      {member.role.replaceAll("_", " ")}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-5">
                              <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone-500">
                                CRM Link
                              </p>
                              <div className="mt-4 space-y-3 text-sm text-stone-700">
                                <div className="rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
                                  Lead: {selectedProject.leadId ?? "Not linked"}
                                </div>
                                <div className="rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
                                  Customer: {selectedProject.customerId ?? "Not linked"}
                                </div>
                              </div>
                            </div>
                          </aside>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-6 py-12 text-center text-stone-500">
                        Pick a project from the left rail or create a new one to start managing tasks.
                      </div>
                    )}
                  </section>
                </div>
              </section>
            ) : null}

            {activeTab === "CRON_JOBS" && me.role === "ADMIN" ? (
              <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-8 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                      Admin Panel
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold">Cron job activity</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">
                      Review recent briefing and reminder runs from the backend scheduler. This log helps you verify when jobs were queued and whether any run failed.
                    </p>
                  </div>
                  <button
                    className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
                    onClick={() => void loadCronJobLogs()}
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-8 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/80">
                  <div className="grid grid-cols-[200px_150px_minmax(0,1.5fr)_140px_220px] gap-4 border-b border-[var(--line)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
                    <span>Time</span>
                    <span>Type</span>
                    <span>Action</span>
                    <span>Status</span>
                    <span>User</span>
                  </div>
                  <div>
                    {loadingCronJobLogs ? (
                      <div className="px-4 py-8 text-sm text-stone-500">
                        Loading cron job logs...
                      </div>
                    ) : cronJobLogs.length === 0 ? (
                      <div className="px-4 py-8 text-sm text-stone-500">
                        No cron jobs have been logged yet.
                      </div>
                    ) : (
                      cronJobLogs.map((log) => (
                        <div
                          key={log.id}
                          className="grid grid-cols-[200px_150px_minmax(0,1.5fr)_140px_220px] gap-4 border-b border-[var(--line)] px-4 py-4 text-sm"
                        >
                          <div className="text-stone-700">
                            {formatDateTimeWithSettings(
                              log.executedAt,
                              settingsForm.timeZone,
                              settingsForm.language,
                            )}
                          </div>
                          <div className="font-medium text-stone-800">{log.jobType}</div>
                          <div>
                            <p className="text-stone-950">{log.action}</p>
                            {log.details ? (
                              <p className="mt-1 text-xs leading-5 text-stone-500">{log.details}</p>
                            ) : null}
                          </div>
                          <div>
                            <span
                              className={clsx(
                                "rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em]",
                                log.status === "QUEUED"
                                  ? "bg-teal-100 text-teal-900"
                                  : log.status === "FAILED"
                                    ? "bg-rose-100 text-rose-900"
                                    : "bg-stone-100 text-stone-800",
                              )}
                            >
                              {log.status}
                            </span>
                          </div>
                          <div className="text-stone-700">
                            {log.user ? (
                              <>
                                <p className="font-medium text-stone-900">
                                  {log.user.name?.trim() || log.user.email}
                                </p>
                                <p className="mt-1 text-xs text-stone-500">{log.user.email}</p>
                              </>
                            ) : (
                              "System"
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === "SETTINGS" ? (
              <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-8 backdrop-blur-xl">
                <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                      Settings
                    </p>
                    <h2 className="mt-3 text-3xl font-semibold">Workspace preferences</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                      Set the operating defaults for time zone and currency. These preferences are saved to your profile so your workspace stays consistent every time you return.
                    </p>

                    <div className="mt-8 grid gap-4">
                      <AccordionSection title="Time zone" icon={Clock3}>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          Used for how your workspace should think about local time while planning your day.
                        </p>
                        <div className="mt-4">
                          <SelectInput
                            label="Time zone"
                            value={settingsForm.timeZone}
                            onChange={(value) => void saveSettings({ timeZone: value })}
                            options={[...TIME_ZONE_OPTIONS]}
                          />
                        </div>
                      </AccordionSection>

                      <AccordionSection title="Currency" icon={Columns3}>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          Applied to budget context across leads, customers, and project discussions.
                        </p>
                        <div className="mt-4">
                          <SearchableSelectInput
                            label="Currency"
                            value={settingsForm.currency}
                            onChange={(value) => void saveSettings({ currency: value })}
                            options={[...CURRENCY_OPTIONS]}
                            searchPlaceholder="Search currency or code"
                          />
                        </div>
                      </AccordionSection>

                      <AccordionSection title="Automation timings" icon={Radar}>
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          Control when the daily briefing is sent and how early task reminders should arrive.
                        </p>
                        <div className="mt-4 grid gap-4">
                          <label className="block text-sm">
                            <span className="mb-2 block">Briefing time</span>
                            <input
                              className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
                              type="time"
                              value={settingsForm.briefingTime}
                              onChange={(event) =>
                                void saveSettings({ briefingTime: event.target.value })
                              }
                            />
                          </label>
                          <SelectInput
                            label="First reminder"
                            value={String(settingsForm.firstReminderMinutes)}
                            onChange={(value) =>
                              void saveSettings({ firstReminderMinutes: Number(value) })
                            }
                            options={[...REMINDER_MINUTE_OPTIONS]}
                          />
                          <SelectInput
                            label="Second reminder"
                            value={String(settingsForm.secondReminderMinutes)}
                            onChange={(value) =>
                              void saveSettings({ secondReminderMinutes: Number(value) })
                            }
                            options={[...REMINDER_MINUTE_OPTIONS]}
                          />
                        </div>
                      </AccordionSection>

                      {me.role === "ADMIN" ? (
                        <AccordionSection title="Departments & positions" icon={Users}>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            Manage the department catalog centrally. Team profiles can only use departments and positions configured here.
                          </p>
                          <form className="mt-4 grid gap-4" onSubmit={saveDepartmentSettings}>
                            {departmentSettingsForm.length ? (
                              departmentSettingsForm.map((department, departmentIndex) => (
                                <div
                                  key={`department-setting-${departmentIndex}`}
                                  className="grid gap-3 rounded-2xl border border-[var(--line)] bg-stone-50 p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <FormInput
                                      label="Department"
                                      value={department.name}
                                      onChange={(value) =>
                                        setDepartmentSettingsForm((current) =>
                                          current.map((item, itemIndex) =>
                                            itemIndex === departmentIndex
                                              ? { ...item, name: value }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                    <button
                                      className="mt-7 h-12 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700"
                                      type="button"
                                      onClick={() =>
                                        setDepartmentSettingsForm((current) =>
                                          current.filter((_, itemIndex) => itemIndex !== departmentIndex),
                                        )
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>

                                  <div className="grid gap-3">
                                    <p className="text-sm font-medium text-stone-900">Positions</p>
                                    {department.positions.length ? (
                                      department.positions.map((position, positionIndex) => (
                                        <div
                                          key={`department-${departmentIndex}-position-${positionIndex}`}
                                          className="flex items-center gap-3"
                                        >
                                          <input
                                            className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
                                            value={position}
                                            onChange={(event) =>
                                              setDepartmentSettingsForm((current) =>
                                                current.map((item, itemIndex) =>
                                                  itemIndex === departmentIndex
                                                    ? {
                                                        ...item,
                                                        positions: item.positions.map((entry, entryIndex) =>
                                                          entryIndex === positionIndex
                                                            ? event.target.value
                                                            : entry,
                                                        ),
                                                      }
                                                    : item,
                                                ),
                                              )
                                            }
                                          />
                                          <button
                                            className="h-12 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700"
                                            type="button"
                                            onClick={() =>
                                              setDepartmentSettingsForm((current) =>
                                                current.map((item, itemIndex) =>
                                                  itemIndex === departmentIndex
                                                    ? {
                                                        ...item,
                                                        positions: item.positions.filter(
                                                          (_, entryIndex) => entryIndex !== positionIndex,
                                                        ),
                                                      }
                                                    : item,
                                                ),
                                              )
                                            }
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-stone-500">
                                        No positions added yet for this department.
                                      </div>
                                    )}
                                    <button
                                      className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-medium"
                                      type="button"
                                      onClick={() =>
                                        setDepartmentSettingsForm((current) =>
                                          current.map((item, itemIndex) =>
                                            itemIndex === departmentIndex
                                              ? { ...item, positions: [...item.positions, ""] }
                                              : item,
                                          ),
                                        )
                                      }
                                    >
                                      Add position
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white px-4 py-4 text-sm text-stone-500">
                                No departments configured yet. Add one below to make department assignments available in Teams.
                              </div>
                            )}

                            <button
                              className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-medium"
                              type="button"
                              onClick={() =>
                                setDepartmentSettingsForm((current) => [
                                  ...current,
                                  { name: "", positions: [] },
                                ])
                              }
                            >
                              Add Department
                            </button>

                            <button
                              className="h-12 rounded-2xl bg-stone-950 px-5 text-white disabled:cursor-not-allowed disabled:opacity-50"
                              type="submit"
                              disabled={savingDepartments}
                            >
                              {savingDepartments ? "Saving departments..." : "Save Departments"}
                            </button>
                          </form>
                        </AccordionSection>
                      ) : null}

                      {me.role === "ADMIN" ? (
                        <AccordionSection title="Action follow-up options" icon={CheckCircle2}>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            Manage the follow-up dropdown used in scheduled actions and action history across lead screens.
                          </p>
                          <form className="mt-4 grid gap-4" onSubmit={saveActionFollowUpSettings}>
                            {actionFollowUpOptions.map((option) => (
                              <div key={option.id} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-stone-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
                                    {option.id}
                                  </p>
                                  <button
                                    className="text-xs font-medium text-rose-700"
                                    type="button"
                                    onClick={() => removeActionFollowUpOption(option.id)}
                                  >
                                    Remove
                                  </button>
                                </div>
                                <FormInput
                                  label="Option label"
                                  value={option.title}
                                  onChange={(value) =>
                                    setActionFollowUpOptions((current) =>
                                      current.map((item) =>
                                        item.id === option.id ? { ...item, title: value } : item,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            ))}
                            <div className="grid gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-white p-4">
                              <FormInput
                                label="Add new follow-up option"
                                value={newActionFollowUpTitle}
                                onChange={setNewActionFollowUpTitle}
                              />
                              <button
                                className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-medium"
                                type="button"
                                onClick={addActionFollowUpOption}
                              >
                                Add Option
                              </button>
                            </div>
                            <button
                              className="h-12 rounded-2xl bg-stone-950 px-5 text-white disabled:cursor-not-allowed disabled:opacity-50"
                              type="submit"
                              disabled={savingActionFollowUpOptions}
                            >
                              {savingActionFollowUpOptions ? "Saving follow-ups..." : "Save Follow-up Options"}
                            </button>
                          </form>
                        </AccordionSection>
                      ) : null}

                      {me.role === "ADMIN" ? (
                        <AccordionSection title="Kanban stages" icon={Workflow}>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            Set the global stage labels used by the dashboard board, lead forms, and stage dropdowns.
                          </p>
                          <form className="mt-4 grid gap-4" onSubmit={saveKanbanSettings}>
                            {kanbanStages.map((stage) => (
                              <div key={stage.id} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-stone-50 p-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
                                    {stage.id}
                                  </p>
                                  {!REQUIRED_KANBAN_STAGE_IDS.includes(
                                    stage.id as (typeof REQUIRED_KANBAN_STAGE_IDS)[number],
                                  ) ? (
                                    <button
                                      className="text-xs font-medium text-rose-700"
                                      type="button"
                                      onClick={() => removeKanbanStage(stage.id)}
                                    >
                                      Remove
                                    </button>
                                  ) : null}
                                </div>
                                <FormInput
                                  label="Stage label"
                                  value={stage.title}
                                  onChange={(value) =>
                                    setKanbanStages((current) =>
                                      current.map((item) =>
                                        item.id === stage.id ? { ...item, title: value } : item,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            ))}
                            <div className="grid gap-3 rounded-2xl border border-dashed border-[var(--line)] bg-white p-4">
                              <FormInput
                                label="Add new stage"
                                value={newKanbanStageTitle}
                                onChange={setNewKanbanStageTitle}
                              />
                              <button
                                className="h-11 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-medium"
                                type="button"
                                onClick={addKanbanStage}
                              >
                                Add Stage
                              </button>
                            </div>
                            <button
                              className="h-12 rounded-2xl bg-stone-950 px-5 text-white disabled:cursor-not-allowed disabled:opacity-50"
                              type="submit"
                              disabled={savingKanbanStages}
                            >
                              {savingKanbanStages ? "Saving stages..." : "Save Kanban Stages"}
                            </button>
                          </form>
                        </AccordionSection>
                      ) : null}

                      {me.role === "ADMIN" ? (
                        <AccordionSection title="Global SMTP" icon={Mail}>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            Shared email delivery settings for the whole CRM. Admin changes here apply globally.
                          </p>
                          <form className="mt-4 grid gap-4" onSubmit={saveSmtpSettings}>
                            <FormInput
                              label="SMTP Host"
                              value={smtpForm.smtpHost}
                              onChange={(value) =>
                                setSmtpForm((current) => ({ ...current, smtpHost: value }))
                              }
                            />
                            <FormInput
                              label="SMTP Port"
                              value={smtpForm.smtpPort}
                              onChange={(value) =>
                                setSmtpForm((current) => ({
                                  ...current,
                                  smtpPort: value.replace(/\D/g, ""),
                                }))
                              }
                            />
                            <SelectInput
                              label="Connection Security"
                              value={smtpForm.smtpSecure ? "true" : "false"}
                              onChange={(value) =>
                                setSmtpForm((current) => ({
                                  ...current,
                                  smtpSecure: value === "true",
                                }))
                              }
                              options={[
                                { label: "TLS / SSL", value: "true" },
                                { label: "STARTTLS / Plain", value: "false" },
                              ]}
                            />
                            <FormInput
                              label="SMTP Username"
                              value={smtpForm.smtpUsername}
                              onChange={(value) =>
                                setSmtpForm((current) => ({ ...current, smtpUsername: value }))
                              }
                            />
                            <FormInput
                              label="SMTP Password"
                              type="password"
                              value={smtpForm.smtpPassword}
                              onChange={(value) =>
                                setSmtpForm((current) => ({ ...current, smtpPassword: value }))
                              }
                            />
                            <FormInput
                              label="From Email"
                              value={smtpForm.smtpFromEmail}
                              onChange={(value) =>
                                setSmtpForm((current) => ({ ...current, smtpFromEmail: value }))
                              }
                            />
                            <FormInput
                              label="From Name"
                              value={smtpForm.smtpFromName}
                              onChange={(value) =>
                                setSmtpForm((current) => ({ ...current, smtpFromName: value }))
                              }
                            />
                            <button
                              className="h-12 rounded-2xl bg-stone-950 px-5 text-white disabled:cursor-not-allowed disabled:opacity-50"
                              type="submit"
                              disabled={savingSmtp}
                            >
                              {savingSmtp ? "Saving SMTP..." : "Save SMTP Settings"}
                            </button>
                          </form>
                        </AccordionSection>
                      ) : null}
                    </div>
                  </div>

                  <aside className="rounded-[1.5rem] border border-[var(--line)] bg-stone-950 p-5 text-stone-50">
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300">
                      Active Profile
                    </p>
                    <div className="mt-5 space-y-4 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-stone-300">Time zone</p>
                        <p className="mt-1 font-medium text-white">{settingsForm.timeZone}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-stone-300">Currency</p>
                        <p className="mt-1 font-medium text-white">{settingsForm.currency}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-stone-300">Briefing</p>
                        <p className="mt-1 font-medium text-white">{settingsForm.briefingTime}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <p className="text-stone-300">Notifications</p>
                        <p className="mt-1 font-medium text-white">
                          {settingsForm.firstReminderMinutes}m and {settingsForm.secondReminderMinutes}m
                        </p>
                      </div>
                      {me.role === "ADMIN" ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                          <p className="text-stone-300">SMTP</p>
                          <p className="mt-1 font-medium text-white">
                            {smtpForm.smtpHost ? `${smtpForm.smtpHost}:${smtpForm.smtpPort}` : "Not configured"}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-6 text-xs leading-6 text-stone-300">
                      Preferences are saved to your user profile so the dashboard and briefing messages can use the same settings.
                    </p>
                    {savingSettings ? (
                      <p className="mt-4 text-xs uppercase tracking-[0.2em] text-amber-300">
                        Saving settings...
                      </p>
                    ) : null}
                  </aside>
                </div>
              </section>
            ) : null}

            {activeTab !== "PROJECTS" && activeTab !== "SETTINGS" && activeTab !== "CRON_JOBS" ? (
              <>
            <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LayoutDashboard className="h-4 w-4 text-teal-700" />
                  Briefing Mirror
                </div>
                <button
                  className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
                  onClick={() => void sendMorningSummary()}
                  disabled={sendingSummary}
                >
                  {sendingSummary ? "Sending..." : "Send Summary"}
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-[1.25rem] bg-stone-950 p-4 font-mono text-xs leading-6 text-amber-200">
                {dashboard?.morningBrief.message ?? "No briefing generated yet."}
              </pre>
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-stone-500">
                    {activeTab === "CUSTOMERS"
                      ? "Customer Directory"
                      : activeTab === "TEAMS"
                        ? "Team Directory"
                      : activeTab === "DASHBOARD"
                        ? "Dashboard Overview"
                        : "Lead Directory"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {activeTab === "CUSTOMERS"
                      ? "Customer list"
                      : activeTab === "TEAMS"
                        ? "Team list"
                      : activeTab === "DASHBOARD"
                        ? "Current workload"
                        : "Lead list"}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-2 text-sm font-medium text-white"
                    onClick={() =>
                      activeTab === "TEAMS" ? setShowTeamForm(true) : setShowLeadForm(true)
                    }
                  >
                    <Plus className="h-4 w-4" />
                    {activeTab === "TEAMS" ? "Add team" : "Add lead"}
                  </button>
                  <button
                    className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
                    onClick={loadData}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {activeTab === "LEADS" ? (
                <>
                  <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <label className="flex h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4">
                      <Search className="h-4 w-4 text-stone-500" />
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="Search leads by name, phone, email, or owner"
                        value={leadSearch}
                        onChange={(event) => setLeadSearch(event.target.value)}
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="h-10 min-w-44 rounded-2xl border border-[var(--line)] bg-white px-4 text-sm font-medium text-stone-800"
                        value={kanbanOwnerFilter}
                        onChange={(event) => setKanbanOwnerFilter(event.target.value)}
                      >
                        <option value="ALL">All owners</option>
                        {selectableUsers.map((user) => (
                          <option key={`lead-owner-${user.id}`} value={String(user.id)}>
                            {getUserDisplayName(user)}
                          </option>
                        ))}
                      </select>
                      <button
                        className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setShowBulkTransferModal(true)}
                        disabled={selectedLeadIds.length === 0}
                      >
                        Transfer Selected ({selectedLeadIds.length})
                      </button>
                      <button
                        className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium"
                        onClick={() => setShowImportModal(true)}
                      >
                        Import Leads
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/80">
                    <div className="grid grid-cols-[48px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-4 border-b border-[var(--line)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      <label className="flex items-center justify-center">
                        <input
                          className="h-4 w-4 rounded border-[var(--line)]"
                          type="checkbox"
                          checked={
                            paginatedLeads.length > 0 &&
                            paginatedLeads.every((lead) => selectedLeadIds.includes(lead.id))
                          }
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedLeadIds((current) =>
                                Array.from(new Set([...current, ...paginatedLeads.map((lead) => lead.id)])),
                              );
                            } else {
                              setSelectedLeadIds((current) =>
                                current.filter(
                                  (leadId) => !paginatedLeads.some((lead) => lead.id === leadId),
                                ),
                              );
                            }
                          }}
                        />
                      </label>
                      <span>Name</span>
                      <span>Contact</span>
                      <span>Owner</span>
                      <span>Stage</span>
                    </div>
                    <div>
                      {paginatedLeads.map((lead) => (
                        <div
                          key={lead.id}
                          className="grid w-full grid-cols-[48px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-4 border-b border-[var(--line)] px-4 py-4 text-left transition hover:bg-stone-50"
                          onClick={() => void openLead(lead.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              void openLead(lead.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <label className="flex items-center justify-center" onClick={(event) => event.stopPropagation()}>
                            <input
                              className="h-4 w-4 rounded border-[var(--line)]"
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                setSelectedLeadIds((current) =>
                                  checked
                                    ? Array.from(new Set([...current, lead.id]))
                                    : current.filter((leadId) => leadId !== lead.id),
                                );
                              }}
                            />
                          </label>
                          <div>
                            <p className="font-medium text-stone-950">{lead.name}</p>
                            <p className="mt-1 text-sm text-stone-500">{lead.email || "No email"}</p>
                          </div>
                          <div className="text-sm text-stone-700">
                            <p>{lead.phone}</p>
                            <p className="mt-1 text-stone-500">{lead.status}</p>
                          </div>
                          <div className="text-sm text-stone-700">
                            {lead.assignedTo?.email || "Unassigned"}
                          </div>
                          <div>
                            <select
                              className="h-10 w-full rounded-xl border border-[var(--line)] bg-stone-50 px-3 text-xs font-medium uppercase tracking-[0.14em] text-stone-800"
                              value={normalizePipelineStage(lead.pipelineStage)}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) => {
                                event.stopPropagation();
                                void updateLeadRow(lead.id, {
                                  pipelineStage: event.target.value,
                                });
                              }}
                            >
                              {pipelineStageOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                      {searchedLeads.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-stone-500">
                          No leads match your search.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <PaginationControls
                    className="mt-4"
                    page={leadPage}
                    pageSize={LIST_PAGE_SIZE}
                    total={searchedLeads.length}
                    onPageChange={setLeadPage}
                    label="leads"
                  />
                </>
              ) : activeTab === "CUSTOMERS" ? (
                <>
                  <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/80">
                    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-4 border-b border-[var(--line)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      <span>Name</span>
                      <span>Contact</span>
                      <span>Owner</span>
                      <span>Status</span>
                    </div>
                    <div>
                      {paginatedCustomers.map((lead) => (
                        <button
                          key={lead.id}
                          className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_140px] gap-4 border-b border-[var(--line)] px-4 py-4 text-left transition hover:bg-stone-50"
                          onClick={() => void openLead(lead.id)}
                        >
                          <div>
                            <p className="font-medium text-stone-950">{lead.name}</p>
                            <p className="mt-1 text-sm text-stone-500">{lead.email || "No email"}</p>
                          </div>
                          <div className="text-sm text-stone-700">
                            <p>{lead.phone}</p>
                            <p className="mt-1 text-stone-500">{getStageLabel(lead.pipelineStage)}</p>
                          </div>
                          <div className="text-sm text-stone-700">
                            {lead.assignedTo?.email || "Unassigned"}
                          </div>
                          <div>
                            <span className="rounded-full bg-teal-100 px-3 py-2 text-xs uppercase tracking-[0.18em] text-teal-900">
                              Customer
                            </span>
                          </div>
                        </button>
                      ))}
                      {filteredLeads.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-stone-500">
                          No customers available.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <PaginationControls
                    className="mt-4"
                    page={customerPage}
                    pageSize={LIST_PAGE_SIZE}
                    total={filteredLeads.length}
                    onPageChange={setCustomerPage}
                    label="customers"
                  />
                </>
              ) : activeTab === "TEAMS" ? (
                <>
                  <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <label className="flex h-12 w-full max-w-xl items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4">
                      <Search className="h-4 w-4 text-stone-500" />
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        placeholder="Search team by email, role, or WhatsApp status"
                        value={teamSearch}
                        onChange={(event) => setTeamSearch(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white/80">
                    <div className="grid grid-cols-[minmax(0,1.3fr)_180px_160px_140px_140px] gap-4 border-b border-[var(--line)] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.22em] text-stone-500">
                      <span>Member</span>
                      <span>Department</span>
                      <span>Phone</span>
                      <span>Role</span>
                      <span>WhatsApp</span>
                    </div>
                    <div>
                      {paginatedTeams.map((user) => (
                        <button
                          key={user.id}
                          className="grid w-full grid-cols-[minmax(0,1.3fr)_180px_160px_140px_140px] gap-4 border-b border-[var(--line)] px-4 py-4 text-left transition hover:bg-stone-50"
                          onClick={() => void openTeamMember(user.id)}
                          type="button"
                        >
                          <div className="flex items-start gap-3">
                            <UserAvatar user={user} size="sm" />
                            <div>
                              <p className="font-medium text-stone-950">{getUserDisplayName(user)}</p>
                              <p className="mt-1 text-sm text-stone-500">{user.email}</p>
                              <p className="mt-1 text-sm text-stone-500">
                              {user.id === me?.id ? "You" : "Chat from the left dock"}
                              </p>
                            </div>
                          </div>
                          <div className="text-sm text-stone-700">
                            {user.departmentAssignments?.length ? (
                              <div className="space-y-1">
                                {user.departmentAssignments.slice(0, 2).map((assignment) => (
                                  <p key={assignment.id}>
                                    {assignment.department.name} / {assignment.position.title}
                                  </p>
                                ))}
                                {user.departmentAssignments.length > 2 ? (
                                  <p className="text-xs text-stone-500">
                                    +{user.departmentAssignments.length - 2} more
                                  </p>
                                ) : null}
                              </div>
                            ) : (
                              "Not assigned"
                            )}
                          </div>
                          <div className="text-sm text-stone-700">
                            {user.phone || "No phone"}
                          </div>
                          <div className="text-sm text-stone-700">{user.role}</div>
                          <div>
                            <span
                              className={clsx(
                                "rounded-full px-3 py-2 text-xs uppercase tracking-[0.18em]",
                                user.whatsappConnected
                                  ? "bg-teal-100 text-teal-900"
                                  : "bg-amber-100 text-amber-900",
                              )}
                            >
                              {user.whatsappConnected ? "Connected" : "Offline"}
                            </span>
                          </div>
                        </button>
                      ))}
                      {searchableTeams.length === 0 ? (
                        <div className="px-4 py-8 text-sm text-stone-500">
                          No team members match your search.
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <PaginationControls
                    className="mt-4"
                    page={teamPage}
                    pageSize={LIST_PAGE_SIZE}
                    total={searchableTeams.length}
                    onPageChange={setTeamPage}
                    label="team members"
                  />
                </>
              ) : (
                <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {groupedLeads.map((column) => (
                      <KanbanColumn
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        count={column.leads.length}
                        pagination={
                          activeTab === "DASHBOARD" &&
                          column.id === "NEW" &&
                          column.leads.length > DASHBOARD_NEW_PAGE_SIZE
                            ? {
                                page: dashboardNewPage,
                                totalPages: dashboardNewTotalPages,
                                onPrevious: () => setDashboardNewPage((current) => Math.max(1, current - 1)),
                                onNext: () =>
                                  setDashboardNewPage((current) =>
                                    Math.min(dashboardNewTotalPages, current + 1),
                                  ),
                              }
                            : undefined
                        }
                      >
                        {(activeTab === "DASHBOARD" && column.id === "NEW"
                          ? column.leads.slice(
                              (dashboardNewPage - 1) * DASHBOARD_NEW_PAGE_SIZE,
                              dashboardNewPage * DASHBOARD_NEW_PAGE_SIZE,
                            )
                          : column.leads
                        ).map((lead) => (
                          <LeadCard key={lead.id} lead={lead} onOpen={() => void openLead(lead.id)} />
                        ))}
                        {column.leads.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-stone-500">
                            No leads in {column.title.toLowerCase()}.
                          </div>
                        ) : null}
                      </KanbanColumn>
                    ))}
                  </div>
                </DndContext>
              )}
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Workflow className="h-4 w-4 text-teal-700" />
                Today&apos;s scheduled actions
              </div>
              <div className="mt-4 grid gap-3">
                {filteredTodayActions.map((action) => (
                  <button
                    key={action.id}
                    className={clsx(
                      "flex items-center justify-between rounded-[1.5rem] border px-4 py-3 text-left transition",
                      getActionStateTone(action) === "red" &&
                        "border-rose-200 bg-rose-50/90 hover:border-rose-300",
                      getActionStateTone(action) === "green" &&
                        "border-emerald-200 bg-emerald-50/90 hover:border-emerald-300",
                      getActionStateTone(action) === "neutral" &&
                        "border-[var(--line)] bg-white/80 hover:border-stone-950/20",
                    )}
                    onClick={() => void openLead(action.lead.id)}
                    type="button"
                  >
                    <div>
                      <p className="font-medium">{action.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{action.lead.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                        {formatTimeWithSettings(
                          action.scheduledAt,
                          settingsForm.timeZone,
                          settingsForm.language,
                        )}{" "}
                        {settingsForm.timeZone}
                      </span>
                      <p
                        className={clsx(
                          "mt-2 text-[11px] font-medium uppercase tracking-[0.18em]",
                          getActionStateTone(action) === "red" && "text-rose-700",
                          getActionStateTone(action) === "green" && "text-emerald-700",
                          getActionStateTone(action) === "neutral" && "text-stone-500",
                        )}
                      >
                        {action.isDone
                          ? formatActionOutcome(action.outcomeStatus, actionFollowUpOptions)
                          : new Date(action.scheduledAt) < new Date()
                            ? "Overdue"
                            : "Scheduled"}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredTodayActions.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                    No scheduled actions for {activeTab === "CUSTOMERS" ? "customers" : "leads"} today.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-teal-700" />
                Today&apos;s project tasks
              </div>
              <div className="mt-4 grid gap-3">
                {filteredTodayProjectTasks.map((task) => (
                  <button
                    key={task.id}
                    className={clsx(
                      "flex items-center justify-between rounded-[1.5rem] border px-4 py-3 text-left transition",
                      getTaskStateTone(task) === "red" &&
                        "border-rose-200 bg-rose-50/90 hover:border-rose-300",
                      getTaskStateTone(task) === "green" &&
                        "border-emerald-200 bg-emerald-50/90 hover:border-emerald-300",
                      getTaskStateTone(task) === "neutral" &&
                        "border-[var(--line)] bg-white/80 hover:border-stone-950/20",
                    )}
                    onClick={() => {
                      setActiveTab("PROJECTS");
                      void openProjectWorkspace(task.projectId).then(() => void openProjectTask(task.id));
                    }}
                    type="button"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="mt-1 text-sm text-stone-600">{task.project.title}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                        {task.dueDate
                          ? formatTimeWithSettings(
                              task.dueDate,
                              settingsForm.timeZone,
                              settingsForm.language,
                            )
                          : "No due time"}{" "}
                        {task.dueDate ? settingsForm.timeZone : ""}
                      </span>
                      <p
                        className={clsx(
                          "mt-2 text-[11px] font-medium uppercase tracking-[0.18em]",
                          getTaskStateTone(task) === "red" && "text-rose-700",
                          getTaskStateTone(task) === "green" && "text-emerald-700",
                          getTaskStateTone(task) === "neutral" && "text-stone-500",
                        )}
                      >
                        {task.status === "DONE"
                          ? task.dueDate && task.completedAt && new Date(task.completedAt) > new Date(task.dueDate)
                            ? "Completed Late"
                            : "Completed On Time"
                          : getTaskStateTone(task) === "red"
                            ? "Overdue"
                            : "On Track"}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredTodayProjectTasks.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                    No project tasks due today.
                  </div>
                ) : null}
              </div>
            </section>
              </>
            ) : null}
          </section>

        </section>
      </div>

      {me.needsReauth ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 px-4">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-stone-950 p-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 text-sm uppercase tracking-[0.26em] text-amber-300">
              <LockKeyhole className="h-4 w-4" />
              Connection Shield
            </div>
            <h2 className="mt-4 text-3xl font-semibold">Phone pairing required</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              Your WhatsApp session is offline. The dashboard stays locked until the device is paired again.
            </p>
            <button
              className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-amber-300 px-4 font-medium text-stone-950"
              onClick={() => void initializeWhatsAppSession(false)}
            >
              {qr || qrRequested ? "Reconnect session" : "Start QR session"}
            </button>
            {qr || qrRequested ? (
              <button
                className="mt-3 inline-flex h-11 items-center justify-center rounded-2xl border border-white/15 px-4 font-medium text-white"
                onClick={() => void initializeWhatsAppSession(true)}
              >
                Reset QR
              </button>
            ) : null}
            <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
              {qr ? (
                <div className="rounded-[1.5rem] bg-white p-4">
                  <QRCodeSVG value={qr} size={220} />
                </div>
              ) : (
                <div className="max-w-xs text-center text-sm text-stone-300">
                  {connectionMessage ||
                    "Waiting for a live QR payload from the backend. Keep this modal open while the Socket.io bridge connects."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showProjectForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 px-4">
          <form
            className="w-full max-w-2xl rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[0_24px_80px_rgba(23,18,13,0.12)]"
            onSubmit={createWorkspaceProject}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                  Project setup
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Create project</h2>
              </div>
              <button type="button" onClick={() => setShowProjectForm(false)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <FormInput
                label="Project title"
                value={projectFormState.title}
                onChange={(value) =>
                  setProjectFormState((current) => ({ ...current, title: value }))
                }
              />
              <FormInput
                label="Project key"
                value={projectFormState.key}
                onChange={(value) =>
                  setProjectFormState((current) => ({ ...current, key: value.toUpperCase() }))
                }
              />
              <SelectInput
                label="Status"
                value={projectFormState.status}
                onChange={(value) =>
                  setProjectFormState((current) => ({
                    ...current,
                    status: value as ProjectStatus,
                  }))
                }
                options={PROJECT_STATUS_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
              />
              <SelectInput
                label="Owner"
                value={projectFormState.ownerId}
                onChange={(value) =>
                  setProjectFormState((current) => ({ ...current, ownerId: value }))
                }
                options={[
                  { label: "Current user", value: "" },
                  ...selectableUsers.map((user) => ({
                    label: getUserDisplayName(user),
                    value: String(user.id),
                  })),
                ]}
              />
              <SelectInput
                label="Link lead"
                value={projectFormState.leadId}
                onChange={(value) =>
                  setProjectFormState((current) => ({ ...current, leadId: value }))
                }
                options={[
                  { label: "No linked lead", value: "" },
                  ...leads
                    .filter((lead) => lead.status === "LEAD")
                    .map((lead) => ({ label: lead.name, value: String(lead.id) })),
                ]}
              />
              <SelectInput
                label="Link customer"
                value={projectFormState.customerId}
                onChange={(value) =>
                  setProjectFormState((current) => ({ ...current, customerId: value }))
                }
                options={[
                  { label: "No linked customer", value: "" },
                  ...leads
                    .filter((lead) => lead.status === "CUSTOMER")
                    .map((lead) => ({ label: lead.name, value: String(lead.id) })),
                ]}
              />
              <div className="md:col-span-2">
                <TextAreaInput
                  label="Description"
                  value={projectFormState.description}
                  onChange={(value) =>
                    setProjectFormState((current) => ({ ...current, description: value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <TextAreaInput
                  label="Notes"
                  value={projectFormState.notes}
                  onChange={(value) =>
                    setProjectFormState((current) => ({ ...current, notes: value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <DateTimeInput
                  label="Due date"
                  value={projectFormState.dueDate}
                  onChange={(value) =>
                    setProjectFormState((current) => ({ ...current, dueDate: value }))
                  }
                />
              </div>
              <div className="md:col-span-2 rounded-[1.5rem] border border-[var(--line)] bg-stone-50 p-4">
                <p className="text-sm font-medium text-stone-950">Project team</p>
                <p className="mt-1 text-sm text-stone-500">
                  Pick the teammates who should see tasks, board updates, and activity.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {selectableUsers.map((user) => {
                    const checked = projectFormState.memberIds.includes(String(user.id));

                    return (
                      <label
                        key={`create-project-member-${user.id}`}
                        className="flex items-start gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3"
                      >
                        <input
                          className="mt-1 h-4 w-4 rounded border-[var(--line)]"
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setProjectFormState((current) => ({
                              ...current,
                              memberIds: event.target.checked
                                ? Array.from(new Set([...current.memberIds, String(user.id)]))
                                : current.memberIds.filter((memberId) => memberId !== String(user.id)),
                            }))
                          }
                        />
                        <div>
                          <p className="text-sm font-medium text-stone-950">
                            {getUserDisplayName(user)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-stone-500">
                            {user.role}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <button className="mt-6 h-12 rounded-2xl bg-stone-950 px-5 text-white" type="submit">
              Create Project
            </button>
          </form>
        </div>
      ) : null}

      {showTaskForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 px-4">
          <form
            className="w-full max-w-2xl rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[0_24px_80px_rgba(23,18,13,0.12)]"
            onSubmit={createWorkspaceTask}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                  Task setup
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Create task</h2>
              </div>
              <button type="button" onClick={() => setShowTaskForm(false)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormInput
                  label="Task title"
                  value={taskFormState.title}
                  onChange={(value) =>
                    setTaskFormState((current) => ({ ...current, title: value }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <TextAreaInput
                  label="Description"
                  value={taskFormState.description}
                  onChange={(value) =>
                    setTaskFormState((current) => ({ ...current, description: value }))
                  }
                />
              </div>
              <SelectInput
                label="Parent task"
                value={taskFormState.parentTaskId}
                onChange={(value) =>
                  setTaskFormState((current) => ({ ...current, parentTaskId: value }))
                }
                options={[
                  { label: "Top-level task", value: "" },
                  ...projectListTasks.map((task) => ({
                    label: task.title,
                    value: String(task.id),
                  })),
                ]}
              />
              <SelectInput
                label="Assignee"
                value={taskFormState.assigneeId}
                onChange={(value) =>
                  setTaskFormState((current) => ({ ...current, assigneeId: value }))
                }
                options={[
                  { label: "Unassigned", value: "" },
                  ...projectMembersForAssign,
                ]}
              />
              <SelectInput
                label="Status"
                value={taskFormState.status}
                onChange={(value) =>
                  setTaskFormState((current) => ({
                    ...current,
                    status: value as TaskStatus,
                  }))
                }
                options={TASK_STATUS_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
              />
              <SelectInput
                label="Priority"
                value={taskFormState.priority}
                onChange={(value) =>
                  setTaskFormState((current) => ({
                    ...current,
                    priority: value as TaskPriority,
                  }))
                }
                options={TASK_PRIORITY_OPTIONS.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
              />
              <div className="md:col-span-2">
                <DateTimeInput
                  label="Due date"
                  value={taskFormState.dueDate}
                  onChange={(value) =>
                    setTaskFormState((current) => ({ ...current, dueDate: value }))
                  }
                />
              </div>
            </div>
            <button className="mt-6 h-12 rounded-2xl bg-stone-950 px-5 text-white" type="submit">
              Create Task
            </button>
          </form>
        </div>
      ) : null}

      {projectTaskDrawer ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--panel-strong)] p-6 pb-28 shadow-[-20px_0_70px_rgba(23,18,13,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                Task drawer
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{projectTaskDrawer.title}</h2>
            </div>
            <button
              className="rounded-full border border-[var(--line)] p-2"
              onClick={() => setProjectTaskDrawer(null)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <AccordionSection title="Task Details" icon={CheckCircle2}>
              <div className="grid gap-4">
                <FormInput
                  label="Title"
                  value={projectTaskDrawer.title}
                  onChange={(value) =>
                    setProjectTaskDrawer((current) =>
                      current ? { ...current, title: value } : current,
                    )
                  }
                />
                <TextAreaInput
                  label="Description"
                  value={projectTaskDrawer.description ?? ""}
                  onChange={(value) =>
                    setProjectTaskDrawer((current) =>
                      current ? { ...current, description: value } : current,
                    )
                  }
                />
                <SelectInput
                  label="Status"
                  value={projectTaskDrawer.status}
                  onChange={(value) =>
                    setProjectTaskDrawer((current) =>
                      current ? { ...current, status: value as TaskStatus } : current,
                    )
                  }
                  options={TASK_STATUS_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                />
                <SelectInput
                  label="Priority"
                  value={projectTaskDrawer.priority}
                  onChange={(value) =>
                    setProjectTaskDrawer((current) =>
                      current ? { ...current, priority: value as TaskPriority } : current,
                    )
                  }
                  options={TASK_PRIORITY_OPTIONS.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                />
                <SelectInput
                  label="Assignee"
                  value={String(projectTaskDrawer.assigneeId ?? "")}
                  onChange={(value) =>
                    setProjectTaskDrawer((current) =>
                      current
                        ? {
                            ...current,
                            assigneeId: value ? Number(value) : null,
                            assignee:
                              selectedProject?.members?.find(
                                (member) => member.userId === Number(value),
                              )?.user ?? null,
                          }
                        : current,
                    )
                  }
                  options={[
                    { label: "Unassigned", value: "" },
                    ...projectMembersForAssign,
                  ]}
                />
                <DateTimeInput
                  label="Due date"
                  value={toDateTimeLocal(projectTaskDrawer.dueDate)}
                  onChange={(value) =>
                    setProjectTaskDrawer((current) =>
                      current ? { ...current, dueDate: value || null } : current,
                    )
                  }
                />
              </div>
            </AccordionSection>

            <AccordionSection title="Subtasks" icon={Workflow}>
              <div className="space-y-3">
                {projectTaskDrawer.subtasks?.length ? (
                  projectTaskDrawer.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-stone-950">{subtask.title}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-stone-500">
                          {subtask.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-5 text-sm text-stone-500">
                    No subtasks yet. Use the new task form and choose this task as the parent.
                  </div>
                )}
              </div>
            </AccordionSection>

            <AccordionSection title="Comments" icon={MessageCircleMore}>
              <form className="grid gap-4" onSubmit={addProjectTaskComment}>
                <TextAreaInput
                  label="Add comment"
                  value={taskCommentDraft}
                  onChange={setTaskCommentDraft}
                />
                <button className="h-12 rounded-2xl bg-stone-950 px-5 text-white" type="submit">
                  Add Comment
                </button>
              </form>

              <div className="mt-5 space-y-3">
                {projectTaskDrawer.comments?.length ? (
                  projectTaskDrawer.comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-4"
                    >
                      <p className="text-sm leading-6 text-stone-800">{comment.content}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                        {getUserDisplayName(comment.author)} •{" "}
                        {formatDateTimeWithSettings(
                          comment.createdAt,
                          settingsForm.timeZone,
                          settingsForm.language,
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-5 text-sm text-stone-500">
                    No comments yet.
                  </div>
                )}
              </div>
            </AccordionSection>

            <AccordionSection title="Activity" icon={Radar}>
              <div className="space-y-3">
                {projectTaskDrawer.activities?.length ? (
                  projectTaskDrawer.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-4"
                    >
                      <p className="text-sm leading-6 text-stone-800">{activity.message}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                        {(activity.actor && getUserDisplayName(activity.actor)) || "System"} •{" "}
                        {formatDateTimeWithSettings(
                          activity.createdAt,
                          settingsForm.timeZone,
                          settingsForm.language,
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-5 text-sm text-stone-500">
                    No activity recorded yet.
                  </div>
                )}
              </div>
            </AccordionSection>
          </div>

          <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex w-full max-w-xl items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--panel-strong)]/95 px-6 py-4 backdrop-blur-xl">
            <button
              className="pointer-events-auto h-12 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-rose-700"
              onClick={() => void deleteProjectTask(projectTaskDrawer.id)}
              type="button"
            >
              Delete Task
            </button>
            <button
              className="pointer-events-auto h-12 rounded-2xl bg-stone-950 px-5 text-white"
              onClick={() => void updateProjectTask(projectTaskDrawer.id, projectTaskDrawer)}
              type="button"
            >
              Save Task
            </button>
          </div>
        </div>
      ) : null}

      {showLeadForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 px-4">
          <form
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 pb-28 shadow-[0_24px_80px_rgba(23,18,13,0.12)]"
            onSubmit={createLead}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Create lead</h2>
              <button type="button" onClick={() => setShowLeadForm(false)}>
                Close
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <AccordionSection title="Lead Profile" icon={UserRound}>
                <div className="grid gap-4">
                  <FormInput label="Lead Name" value={leadForm.name} onChange={(value) => setLeadForm((current) => ({ ...current, name: value }))} />
                  <FormInput label="Full Name" value={leadForm.fullName} onChange={(value) => setLeadForm((current) => ({ ...current, fullName: value }))} />
                  <PhoneInput
                    label="Phone"
                    countryCode={leadForm.phoneCountryCode}
                    phone={leadForm.phone}
                    onCountryCodeChange={(value) => setLeadForm((current) => ({ ...current, phoneCountryCode: value }))}
                    onPhoneChange={(value) => setLeadForm((current) => ({ ...current, phone: value }))}
                  />
                  <FormInput label="Email" value={leadForm.email} onChange={(value) => setLeadForm((current) => ({ ...current, email: value }))} />
                </div>
              </AccordionSection>

              <AccordionSection title="Lead Status" icon={Workflow}>
                <div className="grid gap-4">
                  <SelectInput
                    label="Status"
                    value={leadForm.status}
                    onChange={(value) => setLeadForm((current) => ({ ...current, status: value as Lead["status"] }))}
                    options={[
                      { label: "Lead", value: "LEAD" },
                      { label: "Customer", value: "CUSTOMER" },
                    ]}
                  />
                  <SelectInput
                    label="Pipeline Stage"
                    value={normalizePipelineStage(leadForm.pipelineStage)}
                    onChange={(value) => setLeadForm((current) => ({ ...current, pipelineStage: value }))}
                    options={pipelineStageOptions}
                  />
                  <SelectInput
                    label="Owner"
                    value={leadForm.assignedToId}
                    onChange={(value) => setLeadForm((current) => ({ ...current, assignedToId: value }))}
                    options={[
                      { label: "Select a teammate", value: "" },
                      ...selectableUsers.map((user) => ({ label: user.email, value: String(user.id) })),
                    ]}
                  />
                </div>
              </AccordionSection>

              <AccordionSection title="Lead Source Details" icon={Radar}>
                <div className="grid gap-4">
                  <FormInput label="External Lead ID" value={leadForm.externalLeadId} onChange={(value) => setLeadForm((current) => ({ ...current, externalLeadId: value }))} />
                  <FormInput label="Form ID" value={leadForm.formId} onChange={(value) => setLeadForm((current) => ({ ...current, formId: value }))} />
                  <FormInput label="Form Name" value={leadForm.formName} onChange={(value) => setLeadForm((current) => ({ ...current, formName: value }))} />
                  <FormInput label="Platform" value={leadForm.platform} onChange={(value) => setLeadForm((current) => ({ ...current, platform: value }))} />
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
                    Campaign Details
                  </p>
                  <div className="mt-4 grid gap-4">
                    <FormInput label="Ad ID" value={leadForm.adId} onChange={(value) => setLeadForm((current) => ({ ...current, adId: value }))} />
                    <FormInput label="Ad Name" value={leadForm.adName} onChange={(value) => setLeadForm((current) => ({ ...current, adName: value }))} />
                    <FormInput label="Adset ID" value={leadForm.adsetId} onChange={(value) => setLeadForm((current) => ({ ...current, adsetId: value }))} />
                    <FormInput label="Adset Name" value={leadForm.adsetName} onChange={(value) => setLeadForm((current) => ({ ...current, adsetName: value }))} />
                    <FormInput label="Campaign ID" value={leadForm.campaignId} onChange={(value) => setLeadForm((current) => ({ ...current, campaignId: value }))} />
                    <FormInput label="Campaign Name" value={leadForm.campaignName} onChange={(value) => setLeadForm((current) => ({ ...current, campaignName: value }))} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title="Location & Preferences" icon={LayoutDashboard}>
                <div className="grid gap-4">
                  <FormInput label="City" value={leadForm.city} onChange={(value) => setLeadForm((current) => ({ ...current, city: value }))} />
                  <FormInput label="Preferred Location" value={leadForm.preferredLocation} onChange={(value) => setLeadForm((current) => ({ ...current, preferredLocation: value }))} />
                  <FormInput label="Budget" value={leadForm.budget} onChange={(value) => setLeadForm((current) => ({ ...current, budget: value }))} />
                  <SelectInput
                    label="Lead Type"
                    value={leadForm.isOrganic}
                    onChange={(value) => setLeadForm((current) => ({ ...current, isOrganic: value }))}
                    options={[
                      { label: "Unknown", value: "" },
                      { label: "Organic", value: "true" },
                      { label: "Paid", value: "false" },
                    ]}
                  />
                </div>
              </AccordionSection>

              <AccordionSection title="Timeline" icon={Clock3}>
                <DateTimeInput
                  label="Created Time"
                  value={leadForm.sourceCreatedTime}
                  onChange={(value) => setLeadForm((current) => ({ ...current, sourceCreatedTime: value }))}
                />
              </AccordionSection>

              <AccordionSection title="Actions" icon={CheckCircle2}>
                <TextAreaInput
                  label="Custom Disclaimer Responses"
                  value={leadForm.customDisclaimerResponses}
                  onChange={(value) => setLeadForm((current) => ({ ...current, customDisclaimerResponses: value }))}
                />
              </AccordionSection>
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex justify-end border-t border-[var(--line)] bg-[var(--panel-strong)]/95 px-6 py-4 backdrop-blur-xl">
              <button className="pointer-events-auto h-12 rounded-2xl bg-stone-950 px-5 text-white" type="submit">
                Create Lead
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showTeamForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 px-4">
          <form
            className="w-full max-w-xl rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[0_24px_80px_rgba(23,18,13,0.12)]"
            onSubmit={createTeamMember}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Add team member</h2>
              <button type="button" onClick={() => setShowTeamForm(false)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <AvatarUploadInput
                label="Profile picture"
                userPreview={{
                  name: teamForm.name,
                  email: teamForm.email,
                  profileImageUrl: teamForm.profileImageUrl,
                }}
                value={teamForm.profileImageUrl}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, profileImageUrl: value }))
                }
                onError={(message) => setError(message)}
              />
              <FormInput
                label="Name"
                value={teamForm.name}
                onChange={(value) => setTeamForm((current) => ({ ...current, name: value }))}
              />
              <FormInput
                label="Email"
                value={teamForm.email}
                onChange={(value) => setTeamForm((current) => ({ ...current, email: value }))}
              />
              <PhoneInput
                label="Phone"
                countryCode={teamForm.phoneCountryCode}
                phone={teamForm.phone}
                onCountryCodeChange={(value) =>
                  setTeamForm((current) => ({ ...current, phoneCountryCode: value }))
                }
                onPhoneChange={(value) =>
                  setTeamForm((current) => ({ ...current, phone: value }))
                }
              />
              <FormInput
                label="Password"
                value={teamForm.password}
                onChange={(value) => setTeamForm((current) => ({ ...current, password: value }))}
                type="password"
              />
              <SelectInput
                label="Role"
                value={teamForm.role}
                onChange={(value) =>
                  setTeamForm((current) => ({ ...current, role: value as Role }))
                }
                options={[
                  { label: "User", value: "USER" },
                  { label: "Admin", value: "ADMIN" },
                ]}
              />
              {organizationDepartments.length ? (
                <DepartmentAssignmentsEditor
                  assignments={teamForm.assignments}
                  onChange={(assignments) =>
                    setTeamForm((current) => ({ ...current, assignments }))
                  }
                  organizationDepartments={organizationDepartments}
                />
              ) : null}
            </div>
            <button className="mt-6 h-12 rounded-2xl bg-stone-950 px-5 text-white" type="submit">
              Create team member
            </button>
          </form>
        </div>
      ) : null}

      {showImportModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[0_24px_80px_rgba(23,18,13,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                  Lead Import
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Import leads from CSV or XLSX</h2>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)}>
                Close
              </button>
            </div>

            <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">
              Upload a file with columns like `name`, `phone`, `email`, `assignedToEmail`, `assignedToId`, and `pipelineStage`. Duplicate phone numbers are skipped automatically.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleImportLeads}
              />
              <button
                className="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white"
                onClick={() => importInputRef.current?.click()}
                disabled={importingLeads}
              >
                {importingLeads ? "Importing..." : "Choose CSV/XLSX File"}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium"
                onClick={() => downloadLeadSample("csv")}
              >
                <Download className="h-4 w-4" />
                Download CSV Sample
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium"
                onClick={() => downloadLeadSample("xlsx")}
              >
                <Download className="h-4 w-4" />
                Download XLSX Sample
              </button>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-white p-4">
              <p className="text-sm font-medium text-stone-900">Sample columns</p>
              <p className="mt-2 font-mono text-xs leading-6 text-stone-600">
                name, phone, email, assignedToEmail, assignedToId, pipelineStage
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {showBulkTransferModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-950/30 px-4">
          <div className="w-full max-w-xl rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[0_24px_80px_rgba(23,18,13,0.12)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                  Bulk Transfer
                </p>
                <h2 className="mt-2 text-2xl font-semibold">Transfer selected leads</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkTransferModal(false);
                  setBulkTransferToUserId("");
                }}
              >
                Close
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-stone-600">
              Choose who should receive the {selectedLeadIds.length} selected lead
              {selectedLeadIds.length === 1 ? "" : "s"}.
            </p>

            <div className="mt-6 grid gap-4">
              <SelectInput
                label="Transfer to"
                value={bulkTransferToUserId}
                onChange={setBulkTransferToUserId}
                options={[
                  { label: "Select a teammate", value: "" },
                  ...selectableUsers.map((user) => ({
                    label: getUserDisplayName(user),
                    value: String(user.id),
                  })),
                ]}
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm font-medium"
                type="button"
                onClick={() => {
                  setShowBulkTransferModal(false);
                  setBulkTransferToUserId("");
                }}
              >
                Cancel
              </button>
              <button
                className="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => void submitBulkTransfer()}
                disabled={submittingBulkTransfer || !bulkTransferToUserId || selectedLeadIds.length === 0}
              >
                {submittingBulkTransfer ? "Sending..." : "Submit Transfer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTeamMember && teamEditForm ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[-20px_0_70px_rgba(23,18,13,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                Team member profile
              </p>
              <div className="mt-3 flex items-center gap-4">
                <UserAvatar user={selectedTeamMember} size="lg" />
                <div>
                  <h2 className="text-3xl font-semibold">
                    {getUserDisplayName(selectedTeamMember)}
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">{selectedTeamMember.email}</p>
                </div>
              </div>
            </div>
            <button
              className="rounded-full border border-[var(--line)] p-2"
              onClick={() => setSelectedTeamMember(null)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <form className="mt-6 space-y-4 pb-24" onSubmit={saveTeamMember}>
            <AccordionSection title="Profile" icon={UserRound}>
              <div className="grid gap-4">
                <AvatarUploadInput
                  label="Profile picture"
                  userPreview={{
                    name: teamEditForm.name,
                    email: teamEditForm.email,
                    profileImageUrl: teamEditForm.profileImageUrl,
                  }}
                  value={teamEditForm.profileImageUrl}
                  onChange={(value) =>
                    setTeamEditForm((current) =>
                      current ? { ...current, profileImageUrl: value } : current,
                    )
                  }
                  onError={(message) => setError(message)}
                />
                <FormInput
                  label="Name"
                  value={teamEditForm.name}
                  onChange={(value) =>
                    setTeamEditForm((current) => (current ? { ...current, name: value } : current))
                  }
                />
                <FormInput
                  label="Email"
                  value={teamEditForm.email}
                  onChange={(value) =>
                    setTeamEditForm((current) => (current ? { ...current, email: value } : current))
                  }
                />
                <PhoneInput
                  label="Phone"
                  countryCode={teamEditForm.phoneCountryCode}
                  phone={teamEditForm.phone}
                  onCountryCodeChange={(value) =>
                    setTeamEditForm((current) =>
                      current ? { ...current, phoneCountryCode: value } : current,
                    )
                  }
                  onPhoneChange={(value) =>
                    setTeamEditForm((current) => (current ? { ...current, phone: value } : current))
                  }
                />
                <SelectInput
                  label="Role"
                  value={teamEditForm.role}
                  onChange={(value) =>
                    setTeamEditForm((current) =>
                      current ? { ...current, role: value as Role } : current,
                    )
                  }
                  options={[
                    { label: "User", value: "USER" },
                    { label: "Admin", value: "ADMIN" },
                  ]}
                />
                {organizationDepartments.length ? (
                  <DepartmentAssignmentsEditor
                    assignments={teamEditForm.assignments}
                    onChange={(assignments) =>
                      setTeamEditForm((current) =>
                        current ? { ...current, assignments } : current,
                      )
                    }
                    organizationDepartments={organizationDepartments}
                  />
                ) : null}
              </div>
            </AccordionSection>

            <AccordionSection title="Workspace Settings" icon={Settings2}>
              <div className="grid gap-4">
                <SelectInput
                  label="Time zone"
                  value={teamEditForm.timeZone}
                  onChange={(value) =>
                    setTeamEditForm((current) => (current ? { ...current, timeZone: value } : current))
                  }
                  options={[...TIME_ZONE_OPTIONS]}
                />
                <SearchableSelectInput
                  label="Currency"
                  value={teamEditForm.currency}
                  onChange={(value) =>
                    setTeamEditForm((current) => (current ? { ...current, currency: value } : current))
                  }
                  options={[...CURRENCY_OPTIONS]}
                  searchPlaceholder="Search currency or code"
                />
              </div>
            </AccordionSection>

            <AccordionSection title="Automation" icon={Radar}>
              <div className="grid gap-4">
                <label className="block text-sm">
                  <span className="mb-2 block">Briefing time</span>
                  <input
                    className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
                    type="time"
                    value={teamEditForm.briefingTime}
                    onChange={(event) =>
                      setTeamEditForm((current) =>
                        current ? { ...current, briefingTime: event.target.value } : current,
                      )
                    }
                  />
                </label>
                <SelectInput
                  label="First reminder"
                  value={String(teamEditForm.firstReminderMinutes)}
                  onChange={(value) =>
                    setTeamEditForm((current) =>
                      current ? { ...current, firstReminderMinutes: Number(value) } : current,
                    )
                  }
                  options={[...REMINDER_MINUTE_OPTIONS]}
                />
                <SelectInput
                  label="Second reminder"
                  value={String(teamEditForm.secondReminderMinutes)}
                  onChange={(value) =>
                    setTeamEditForm((current) =>
                      current ? { ...current, secondReminderMinutes: Number(value) } : current,
                    )
                  }
                  options={[...REMINDER_MINUTE_OPTIONS]}
                />
              </div>
            </AccordionSection>

            <AccordionSection title="Connection Status" icon={Shield}>
              <div className="grid gap-3 text-sm text-stone-700">
                <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                  WhatsApp: {selectedTeamMember.whatsappConnected ? "Connected" : "Disconnected"}
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                  Re-auth: {selectedTeamMember.needsReauth ? "Required" : "Ready"}
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
                  Created:{" "}
                  {selectedTeamMember.createdAt
                    ? formatDateTimeWithSettings(
                        selectedTeamMember.createdAt,
                        settingsForm.timeZone,
                        settingsForm.language,
                      )
                    : "Unknown"}
                </div>
              </div>
            </AccordionSection>

            {me.role === "ADMIN" ? (
              <div className="pointer-events-none fixed bottom-0 right-0 z-50 flex w-full max-w-xl justify-end border-t border-[var(--line)] bg-[var(--panel-strong)]/95 px-6 py-4 backdrop-blur-xl">
                <button
                  className="pointer-events-auto h-12 rounded-2xl bg-stone-950 px-5 text-white shadow-[0_12px_30px_rgba(23,18,13,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={savingTeamMember}
                >
                  {savingTeamMember ? "Saving..." : "Save Team Member"}
                </button>
              </div>
            ) : null}
          </form>
        </div>
      ) : null}

      {me ? (
        <div className="pointer-events-none fixed bottom-5 left-5 z-30 flex max-w-[calc(100vw-2.5rem)] justify-start">
          <div
            className={clsx(
              "pointer-events-auto overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--panel-strong)] shadow-[0_24px_80px_rgba(23,18,13,0.18)] backdrop-blur-xl transition-all",
              chatWidgetOpen ? "h-[36rem] w-[26rem]" : "h-auto w-auto",
            )}
          >
            {chatWidgetOpen ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-teal-700">
                      Team chat
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-stone-950">Left dock messenger</h2>
                  </div>
                  <button
                    className="rounded-full border border-[var(--line)] p-2 text-stone-600"
                    onClick={() => setChatWidgetOpen(false)}
                    type="button"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-[11rem_minmax(0,1fr)]">
                  <div className="border-r border-[var(--line)] bg-stone-50/80">
                    <div className="border-b border-[var(--line)] px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                        Teammates
                      </p>
                    </div>
                    <div className="max-h-full overflow-y-auto px-2 py-2">
                      {chatTeammates.length === 0 ? (
                        <div className="px-2 py-4 text-sm text-stone-500">
                          No teammates available yet.
                        </div>
                      ) : (
                        chatTeammates.map((user) => (
                          <button
                            key={user.id}
                            className={clsx(
                              "mb-2 w-full rounded-[1.25rem] border px-3 py-3 text-left transition",
                              activeChatUserId === user.id
                                ? "border-stone-950 bg-white shadow-[0_10px_30px_rgba(23,18,13,0.08)]"
                                : "border-transparent bg-transparent hover:border-[var(--line)] hover:bg-white/80",
                            )}
                            onClick={() => {
                              setActiveChatUserId(user.id);
                              setTeamChatDraft("");
                              setChatWidgetOpen(true);
                            }}
                            type="button"
                          >
                            <p className="truncate text-sm font-medium text-stone-950">
                              {getUserDisplayName(user)}
                            </p>
                            <p className="mt-1 truncate text-xs text-stone-500">{user.email}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              {user.whatsappConnected ? "WhatsApp live" : "WhatsApp offline"}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col">
                    <div className="border-b border-[var(--line)] px-4 py-3">
                      <p className="text-sm font-medium text-stone-950">
                        {activeChatUser ? getUserDisplayName(activeChatUser) : "Select a teammate"}
                      </p>
                      {activeChatUser ? (
                        <p className="mt-1 text-xs text-stone-500">{activeChatUser.email}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-stone-500">
                        Messages are sent through your connected WhatsApp session.
                      </p>
                    </div>

                    <div
                      ref={chatThreadRef}
                      className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-white/70 px-4 py-4"
                    >
                      {loadingTeamChat ? (
                        <div className="rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-sm text-stone-500">
                          Loading conversation...
                        </div>
                      ) : teamChatMessages.length === 0 ? (
                        <div className="rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-5 text-sm text-stone-500">
                          Start the thread. Your next message will appear here.
                        </div>
                      ) : (
                        teamChatMessages.map((message) => {
                          const mine = message.senderUserId === me.id;

                          return (
                            <div
                              key={message.id}
                              className={clsx("flex", mine ? "justify-end" : "justify-start")}
                            >
                              <div
                                className={clsx(
                                  "max-w-[85%] rounded-[1.25rem] px-4 py-3 text-sm shadow-[0_8px_24px_rgba(23,18,13,0.06)]",
                                  mine
                                    ? "bg-stone-950 text-white"
                                    : "border border-[var(--line)] bg-white text-stone-900",
                                )}
                              >
                                <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                                <p
                                  className={clsx(
                                    "mt-2 text-[11px] uppercase tracking-[0.16em]",
                                    mine ? "text-stone-300" : "text-stone-500",
                                  )}
                                >
                                  {formatDateTimeWithSettings(
                                    message.createdAt,
                                    settingsForm.timeZone,
                                    settingsForm.language,
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form
                      className="border-t border-[var(--line)] bg-[var(--panel-strong)] px-4 py-4"
                      onSubmit={sendTeamChatMessage}
                    >
                      <label className="block text-sm">
                        <span className="mb-2 block text-stone-600">Reply</span>
                        <textarea
                          className="min-h-[96px] w-full rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 outline-none transition focus:border-stone-950/20"
                          placeholder={
                            activeChatUser
                              ? `Message ${getUserDisplayName(activeChatUser)}`
                              : "Choose a teammate to start chatting"
                          }
                          value={teamChatDraft}
                          onChange={(event) => setTeamChatDraft(event.target.value)}
                          disabled={!activeChatUser || sendingTeamChat}
                        />
                      </label>
                      <div className="mt-3 flex justify-end">
                        <button
                          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                          type="submit"
                          disabled={!activeChatUser || !teamChatDraft.trim() || sendingTeamChat}
                        >
                          <SendHorizontal className="h-4 w-4" />
                          {sendingTeamChat ? "Sending..." : "Send"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <button
                className="flex items-center gap-3 rounded-[2rem] bg-stone-950 px-5 py-4 text-left text-white"
                onClick={() => setChatWidgetOpen(true)}
                type="button"
              >
                <MessageCircleMore className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Team chat</p>
                  <p className="text-xs text-stone-300">
                    {chatTeammates.length} teammate{chatTeammates.length === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {selectedLead ? (
        <div
          className={clsx(
            "fixed z-40 overflow-y-auto bg-[var(--panel-strong)] p-6 pb-28 shadow-[0_24px_80px_rgba(23,18,13,0.18)]",
            leadDrawerExpanded
              ? "inset-6 rounded-[2rem] border border-[var(--line)]"
              : "inset-y-0 right-0 w-full max-w-xl border-l border-[var(--line)]",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                {leadDrawerExpanded ? "Lead management view" : "Lead detail drawer"}
              </p>
              <h2 className="mt-2 text-3xl font-semibold">{selectedLead.name}</h2>
              <p className="mt-2 text-sm text-stone-500">
                {leadDrawerExpanded
                  ? "Edit lead details in a full working surface."
                  : "Open the expanded view for easier lead management."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-[var(--line)] p-2"
                onClick={() => setLeadDrawerExpanded((current) => !current)}
                type="button"
                aria-label={leadDrawerExpanded ? "Shrink lead view" : "Expand lead view"}
                title={leadDrawerExpanded ? "Shrink lead view" : "Expand lead view"}
              >
                {leadDrawerExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
              <button
                className="rounded-full border border-[var(--line)] p-2"
                onClick={() => {
                  setSelectedLead(null);
                  setLeadDrawerExpanded(false);
                }}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {leadEditForm ? (
            <>
            <form
              className={clsx(
                "mt-6 space-y-4",
                leadDrawerExpanded && "grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] xl:space-y-0",
              )}
              onSubmit={saveLeadDetails}
            >
              <div className="space-y-4">
              <AccordionSection title="Lead Profile" icon={UserRound}>
                <div className="grid gap-4">
                  <FormInput label="Lead Name" value={leadEditForm.name} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, name: value } : current))} />
                  <FormInput label="Full Name" value={leadEditForm.fullName} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, fullName: value } : current))} />
                  <PhoneInput
                    label="Phone"
                    countryCode={leadEditForm.phoneCountryCode}
                    phone={leadEditForm.phone}
                    onCountryCodeChange={(value) =>
                      setLeadEditForm((current) =>
                        current ? { ...current, phoneCountryCode: value } : current,
                      )
                    }
                    onPhoneChange={(value) =>
                      setLeadEditForm((current) => (current ? { ...current, phone: value } : current))
                    }
                  />
                  <FormInput label="Email" value={leadEditForm.email} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, email: value } : current))} />
                </div>
              </AccordionSection>

              <AccordionSection title="Lead Status" icon={Workflow}>
                <div className="grid gap-4">
                  <SelectInput
                    label="Status"
                    value={leadEditForm.status}
                    onChange={(value) => setLeadEditForm((current) => (current ? { ...current, status: value as Lead["status"] } : current))}
                    options={[
                      { label: "Lead", value: "LEAD" },
                      { label: "Customer", value: "CUSTOMER" },
                    ]}
                  />
                  <SelectInput
                    label="Pipeline Stage"
                    value={normalizePipelineStage(leadEditForm.pipelineStage)}
                    onChange={(value) => setLeadEditForm((current) => (current ? { ...current, pipelineStage: value } : current))}
                    options={pipelineStageOptions}
                  />
                  <SelectInput
                    label="Owner"
                    value={leadEditForm.assignedToId}
                    onChange={(value) => setLeadEditForm((current) => (current ? { ...current, assignedToId: value } : current))}
                    options={selectableUsers.map((user) => ({ label: user.email, value: String(user.id) }))}
                  />
                </div>
              </AccordionSection>

              {!leadDrawerExpanded ? (
              <AccordionSection title="Lead Source Details" icon={Radar}>
                <div className="grid gap-4">
                  <FormInput label="External Lead ID" value={leadEditForm.externalLeadId} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, externalLeadId: value } : current))} />
                  <FormInput label="Form ID" value={leadEditForm.formId} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, formId: value } : current))} />
                  <FormInput label="Form Name" value={leadEditForm.formName} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, formName: value } : current))} />
                  <FormInput label="Platform" value={leadEditForm.platform} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, platform: value } : current))} />
                </div>

                <div className="mt-5 rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
                    Campaign Details
                  </p>
                  <div className="mt-4 grid gap-4">
                    <FormInput label="Ad ID" value={leadEditForm.adId} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, adId: value } : current))} />
                    <FormInput label="Ad Name" value={leadEditForm.adName} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, adName: value } : current))} />
                    <FormInput label="Adset ID" value={leadEditForm.adsetId} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, adsetId: value } : current))} />
                    <FormInput label="Adset Name" value={leadEditForm.adsetName} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, adsetName: value } : current))} />
                    <FormInput label="Campaign ID" value={leadEditForm.campaignId} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, campaignId: value } : current))} />
                    <FormInput label="Campaign Name" value={leadEditForm.campaignName} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, campaignName: value } : current))} />
                  </div>
                </div>
              </AccordionSection>
              ) : null}

              <AccordionSection title="Location & Preferences" icon={LayoutDashboard}>
                <div className="grid gap-4">
                  <FormInput label="City" value={leadEditForm.city} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, city: value } : current))} />
                  <FormInput label="Preferred Location" value={leadEditForm.preferredLocation} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, preferredLocation: value } : current))} />
                  <FormInput label="Budget" value={leadEditForm.budget} onChange={(value) => setLeadEditForm((current) => (current ? { ...current, budget: value } : current))} />
                  <SelectInput
                    label="Lead Type"
                    value={leadEditForm.isOrganic}
                    onChange={(value) => setLeadEditForm((current) => (current ? { ...current, isOrganic: value } : current))}
                    options={[
                      { label: "Unknown", value: "" },
                      { label: "Organic", value: "true" },
                      { label: "Paid", value: "false" },
                    ]}
                  />
                </div>
              </AccordionSection>

              {!leadDrawerExpanded ? (
              <AccordionSection title="Timeline" icon={Clock3}>
                <DateTimeInput
                  label="Created Time"
                  value={leadEditForm.sourceCreatedTime}
                  onChange={(value) => setLeadEditForm((current) => (current ? { ...current, sourceCreatedTime: value } : current))}
                />
              </AccordionSection>
              ) : null}

              <AccordionSection title="Actions" icon={CheckCircle2}>
                <TextAreaInput
                  label="Custom Disclaimer Responses"
                  value={leadEditForm.customDisclaimerResponses}
                  onChange={(value) => setLeadEditForm((current) => (current ? { ...current, customDisclaimerResponses: value } : current))}
                />

                <div className="mt-6 rounded-[1.25rem] border border-[var(--line)] bg-stone-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.22em] text-stone-500">
                    Schedule Next Action
                  </p>
                  <div className="mt-4 grid gap-4">
                    <FormInput label="Title" value={actionForm.title} onChange={(value) => setActionForm((current) => ({ ...current, title: value }))} />
                    <TextAreaInput label="Notes" value={actionForm.notes} onChange={(value) => setActionForm((current) => ({ ...current, notes: value }))} />
                    <DateTimeInput label="Scheduled At" value={actionForm.scheduledAt} onChange={(value) => setActionForm((current) => ({ ...current, scheduledAt: value }))} />
                    <button className="h-12 rounded-2xl bg-teal-700 px-5 text-white" type="button" onClick={() => void saveAction()}>
                      Save Action
                    </button>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title="Action History" icon={Clock3}>
                <div className="space-y-3">
                  {(selectedLead.actions ?? []).filter((action) => action.isDone).length ? (
                    [...(selectedLead.actions ?? [])]
                      .filter((action) => action.isDone)
                      .sort(
                        (first, second) =>
                          new Date(second.completedAt ?? second.scheduledAt).getTime() -
                          new Date(first.completedAt ?? first.scheduledAt).getTime(),
                      )
                      .map((action) => (
                        <div
                          key={action.id}
                          className={clsx(
                            "rounded-[1.5rem] border px-4 py-4",
                            action.outcomeStatus === "INCOMPLETE"
                              ? "border-rose-200 bg-rose-50"
                              : "border-emerald-200 bg-emerald-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-stone-950">{action.title}</p>
                              <p className="mt-1 text-sm text-stone-600">
                                {action.notes || "No notes added."}
                              </p>
                            </div>
                            <span
                              className={clsx(
                                "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white",
                                action.outcomeStatus === "INCOMPLETE"
                                  ? "bg-rose-600"
                                  : "bg-emerald-600",
                              )}
                            >
                              {formatActionOutcome(action.outcomeStatus, actionFollowUpOptions)}
                            </span>
                          </div>
                          <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                            {formatDateTimeWithSettings(
                              action.completedAt ?? action.scheduledAt,
                              settingsForm.timeZone,
                              settingsForm.language,
                            )}{" "}
                            {settingsForm.timeZone}
                          </p>
                          {action.nextActionTitle ? (
                            <div className="mt-3 rounded-[1rem] border border-[var(--line)] bg-white/80 px-3 py-3">
                              <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
                                Next Action
                              </p>
                              <p className="mt-2 text-sm font-medium text-stone-900">
                                {action.nextActionTitle}
                              </p>
                              {action.nextActionNotes ? (
                                <p className="mt-1 text-sm text-stone-600">{action.nextActionNotes}</p>
                              ) : null}
                              {action.nextActionScheduledAt ? (
                                <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-stone-500">
                                  {formatDateTimeWithSettings(
                                    action.nextActionScheduledAt,
                                    settingsForm.timeZone,
                                    settingsForm.language,
                                  )}{" "}
                                  {settingsForm.timeZone}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                      No action history recorded yet.
                    </div>
                  )}
                </div>
              </AccordionSection>

              {leadDrawerExpanded ? (
                <AccordionSection title="Projects" icon={Workflow}>
                  <div className="grid gap-4">
                    <FormInput
                      label="Project Title"
                      value={projectForm.title}
                      onChange={(value) =>
                        setProjectForm((current) => ({ ...current, title: value }))
                      }
                    />
                    <SelectInput
                      label="Project Status"
                      value={projectForm.status}
                      onChange={(value) =>
                        setProjectForm((current) => ({ ...current, status: value }))
                      }
                      options={[
                        { label: "Planning", value: "PLANNING" },
                        { label: "Active", value: "ACTIVE" },
                        { label: "On Hold", value: "ON_HOLD" },
                        { label: "Completed", value: "COMPLETED" },
                      ]}
                    />
                    <TextAreaInput
                      label="Project Notes"
                      value={projectForm.notes}
                      onChange={(value) =>
                        setProjectForm((current) => ({ ...current, notes: value }))
                      }
                    />
                    <button
                      className="h-12 rounded-2xl border border-[var(--line)] bg-white px-5"
                      type="button"
                      onClick={() => void createProject()}
                    >
                      Add Project
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    {selectedLead.projects?.length ? (
                      selectedLead.projects.map((project) => (
                        <div
                          key={project.id}
                          className="rounded-[1.5rem] border border-[var(--line)] bg-stone-50 px-4 py-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-stone-950">{project.title}</p>
                              <p className="mt-1 text-sm text-stone-600">
                                {project.notes || "No notes added."}
                              </p>
                            </div>
                            <span className="rounded-full bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                              {project.status.replaceAll("_", " ")}
                            </span>
                          </div>
                          <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                            Created{" "}
                            {formatDateTimeWithSettings(
                              project.createdAt,
                              settingsForm.timeZone,
                              settingsForm.language,
                            )}{" "}
                            {settingsForm.timeZone}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                        No projects linked to this lead yet.
                      </div>
                    )}
                  </div>
                </AccordionSection>
              ) : null}

              {leadDrawerExpanded ? (
                <AccordionSection title="Communication History" icon={Mail} className="mt-4">
                  <div className="space-y-3">
                    {selectedLead.messages?.length ? (
                      selectedLead.messages.map((message) => (
                        <div key={message.id} className="rounded-[1.5rem] border border-[var(--line)] bg-white p-4">
                          <p className="text-sm leading-6 text-stone-700">{message.content}</p>
                          <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                            {formatDateTimeWithSettings(
                              message.sentAt,
                              settingsForm.timeZone,
                              settingsForm.language,
                            )}{" "}
                            {settingsForm.timeZone}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                        WhatsApp Messages: No messages logged
                      </div>
                    )}
                  </div>
                </AccordionSection>
              ) : null}
              </div>
              <div className="space-y-4">
          {leadDrawerExpanded ? (
            <AccordionSection title="Scheduled Actions" icon={CalendarDays}>
              <div className="space-y-3">
                {(selectedLead.actions ?? []).filter((action) => !action.isDone).length ? (
                  [...(selectedLead.actions ?? [])]
                    .filter((action) => !action.isDone)
                    .sort(
                      (first, second) =>
                        new Date(first.scheduledAt).getTime() - new Date(second.scheduledAt).getTime(),
                    )
                    .map((action) => {
                      const overdue = !action.isDone && new Date(action.scheduledAt).getTime() < Date.now();
                      const followUpForm =
                        actionFollowUpForms[action.id] ?? createActionFollowUpForm(action);

                      return (
                        <div
                          key={action.id}
                          className={clsx(
                            "rounded-[1.5rem] border px-4 py-4",
                            overdue
                              ? "border-rose-200 bg-rose-50"
                              : action.isDone
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-[var(--line)] bg-stone-50",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-stone-950">{action.title}</p>
                              <p className="mt-1 text-sm text-stone-600">
                                {action.notes || "No notes added."}
                              </p>
                            </div>
                            <span
                              className={clsx(
                                "rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                                overdue
                                  ? "bg-rose-600 text-white"
                                  : action.isDone
                                    ? "bg-emerald-600 text-white"
                                    : "bg-stone-950 text-white",
                              )}
                            >
                              {overdue ? "Overdue" : action.isDone ? "Done" : "Open"}
                            </span>
                          </div>
                          <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                            {formatDateTimeWithSettings(
                              action.scheduledAt,
                              settingsForm.timeZone,
                              settingsForm.language,
                            )}{" "}
                            {settingsForm.timeZone}
                          </p>
                          <div className="mt-4 grid gap-4 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-4">
                            <SelectInput
                              label="Follow-up"
                              value={followUpForm.outcomeStatus}
                              onChange={(value) =>
                                setActionFollowUpForms((current) => ({
                                  ...current,
                                  [action.id]: {
                                    ...followUpForm,
                                    outcomeStatus: value as Action["outcomeStatus"],
                                  },
                                }))
                              }
                              options={[
                                { label: "Choose follow-up", value: "PENDING" },
                                ...actionFollowUpOptions.map((option) => ({
                                  label: option.title,
                                  value: option.id,
                                })),
                              ]}
                            />
                            <FormInput
                              label="Next Action"
                              value={followUpForm.nextActionTitle}
                              onChange={(value) =>
                                setActionFollowUpForms((current) => ({
                                  ...current,
                                  [action.id]: {
                                    ...followUpForm,
                                    nextActionTitle: value,
                                  },
                                }))
                              }
                            />
                            <TextAreaInput
                              label="Next Action Notes"
                              value={followUpForm.nextActionNotes}
                              onChange={(value) =>
                                setActionFollowUpForms((current) => ({
                                  ...current,
                                  [action.id]: {
                                    ...followUpForm,
                                    nextActionNotes: value,
                                  },
                                }))
                              }
                            />
                            <DateTimeInput
                              label="Next Action At"
                              value={followUpForm.nextActionScheduledAt}
                              onChange={(value) =>
                                setActionFollowUpForms((current) => ({
                                  ...current,
                                  [action.id]: {
                                    ...followUpForm,
                                    nextActionScheduledAt: value,
                                  },
                                }))
                              }
                            />
                            {action.outcomeStatus !== "PENDING" ? (
                              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">
                                Current follow-up: {formatActionOutcome(action.outcomeStatus, actionFollowUpOptions)}
                              </p>
                            ) : null}
                            <button
                              className="h-11 rounded-2xl bg-stone-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                              type="button"
                              disabled={savingActionFollowUpId === action.id}
                              onClick={() => void saveActionFollowUp(action.id)}
                            >
                              {savingActionFollowUpId === action.id ? "Saving..." : "Save Follow-up"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                    No scheduled actions for this lead yet.
                  </div>
                )}
              </div>
            </AccordionSection>
          ) : (
          <AccordionSection title="Projects" icon={Workflow}>
            <div className="grid gap-4">
              <FormInput
                label="Project Title"
                value={projectForm.title}
                onChange={(value) =>
                  setProjectForm((current) => ({ ...current, title: value }))
                }
              />
              <SelectInput
                label="Project Status"
                value={projectForm.status}
                onChange={(value) =>
                  setProjectForm((current) => ({ ...current, status: value }))
                }
                options={[
                  { label: "Planning", value: "PLANNING" },
                  { label: "Active", value: "ACTIVE" },
                  { label: "On Hold", value: "ON_HOLD" },
                  { label: "Completed", value: "COMPLETED" },
                ]}
              />
              <TextAreaInput
                label="Project Notes"
                value={projectForm.notes}
                onChange={(value) =>
                  setProjectForm((current) => ({ ...current, notes: value }))
                }
              />
              <button
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-5"
                type="button"
                onClick={() => void createProject()}
              >
                Add Project
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedLead.projects?.length ? (
                selectedLead.projects.map((project) => (
                  <div
                    key={project.id}
                    className="rounded-[1.5rem] border border-[var(--line)] bg-stone-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-stone-950">{project.title}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          {project.notes || "No notes added."}
                        </p>
                      </div>
                      <span className="rounded-full bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white">
                        {project.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                      Created{" "}
                      {formatDateTimeWithSettings(
                        project.createdAt,
                        settingsForm.timeZone,
                        settingsForm.language,
                      )}{" "}
                      {settingsForm.timeZone}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                  No projects linked to this lead yet.
                </div>
              )}
            </div>
          </AccordionSection>
          )}

          {!leadDrawerExpanded ? (
          <AccordionSection title="Transfer Lead" icon={ArrowRightLeft} className="mt-4">
            <div className="grid gap-4">
              <SelectInput
                label="Send to Teammate"
                value={transferToUserId}
                onChange={setTransferToUserId}
                options={[
                  { label: "Choose teammate", value: "" },
                  ...selectableUsers
                    .filter((user) => user.id !== selectedLead.assignedToId)
                    .map((user) => ({ label: user.email, value: String(user.id) })),
                ]}
              />
              <button
                className="h-12 rounded-2xl border border-[var(--line)] bg-white px-5 disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                onClick={() => void requestTransfer()}
                disabled={submittingTransfer || !transferToUserId}
              >
                {submittingTransfer ? "Sending..." : "Submit Transfer Request"}
              </button>
            </div>
          </AccordionSection>
          ) : null}

          {!leadDrawerExpanded ? (
          <AccordionSection title="Communication History" icon={Mail} className="mt-4">
            <div className="space-y-3">
              {selectedLead.messages?.length ? (
                selectedLead.messages.map((message) => (
                  <div key={message.id} className="rounded-[1.5rem] border border-[var(--line)] bg-white p-4">
                    <p className="text-sm leading-6 text-stone-700">{message.content}</p>
                    <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-stone-500">
                      {formatDateTimeWithSettings(
                        message.sentAt,
                        settingsForm.timeZone,
                        settingsForm.language,
                      )}{" "}
                      {settingsForm.timeZone}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                  WhatsApp Messages: No messages logged
                </div>
              )}
            </div>
          </AccordionSection>
          ) : null}
              </div>
            </form>

            <div
              className={clsx(
                "pointer-events-none fixed z-50 flex justify-end border-t border-[var(--line)] bg-[var(--panel-strong)]/95 px-6 py-4 backdrop-blur-xl",
                leadDrawerExpanded
                  ? "bottom-6 left-6 right-6 rounded-b-[2rem]"
                  : "bottom-0 right-0 w-full max-w-xl",
              )}
            >
              <button
                className="pointer-events-auto h-12 rounded-2xl bg-stone-950 px-5 text-white shadow-[0_12px_30px_rgba(23,18,13,0.18)]"
                type="button"
                onClick={() => void persistLeadDetails()}
              >
                Save Lead Details
              </button>
            </div>
            </>
          ) : null}
        </div>
      ) : null}

      {showTransfersDrawer ? (
        <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl overflow-y-auto border-l border-[var(--line)] bg-[var(--panel-strong)] p-6 shadow-[-20px_0_70px_rgba(23,18,13,0.12)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-teal-700">
                Pending transfer queue
              </p>
              <h2 className="mt-2 text-3xl font-semibold">Transfer requests</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Admin approval controls all pending lead ownership changes between teammates.
              </p>
            </div>
            <button
              className="rounded-full border border-[var(--line)] p-2"
              onClick={() => setShowTransfersDrawer(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {pendingTransfers.length ? (
              pendingTransfers.map((transfer) => {
                const canResolve = me.role === "ADMIN";

                return (
                  <article
                    key={transfer.id}
                    className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-stone-950">{transfer.lead.name}</p>
                        <p className="mt-1 text-sm text-stone-600">
                          {transfer.fromUser.email} to {transfer.toUser.email}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-900">
                        {transfer.status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-stone-600">
                      <p>Phone: {transfer.lead.phone}</p>
                      <p>{transfer.lead.status === "CUSTOMER" ? "Customer" : "Lead"}</p>
                      <p>Stage: {getStageLabel(transfer.lead.pipelineStage)}</p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-950"
                        onClick={() => {
                          setShowTransfersDrawer(false);
                          setActiveTab(
                            transfer.lead.status === "CUSTOMER" ? "CUSTOMERS" : "LEADS",
                          );
                          void openLead(transfer.leadId);
                        }}
                      >
                        Open Lead
                      </button>
                      {canResolve ? (
                        <>
                          <button
                            className="rounded-2xl bg-stone-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void resolveTransfer(transfer.id, "accept")}
                            disabled={resolvingTransferId === transfer.id}
                          >
                            {resolvingTransferId === transfer.id ? "Working..." : "Accept"}
                          </button>
                          <button
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => void resolveTransfer(transfer.id, "reject")}
                            disabled={resolvingTransferId === transfer.id}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <p className="self-center text-sm text-stone-500">
                          Waiting for admin approval.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white/70 px-4 py-6 text-sm text-stone-500">
                No pending transfers right now.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(90vw,520px)] -translate-x-1/2 rounded-2xl bg-rose-700 px-4 py-3 text-sm text-white">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-full border border-[var(--line)] bg-white/90 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-stone-700">
          Syncing
        </div>
      ) : null}
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <button
      className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-teal-200 hover:bg-white"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-600">{label}</p>
        <Icon className="h-4 w-4 text-teal-700" />
      </div>
      <p className="mt-4 font-mono text-3xl">{value}</p>
    </button>
  );
}

function ProjectMetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-3 text-xl font-semibold text-stone-950">{value}</p>
      <p className="mt-2 text-sm text-stone-500">{hint}</p>
    </div>
  );
}

function UserAvatar({
  user,
  size = "md",
}: {
  user: Pick<User, "name" | "email"> & { profileImageUrl?: string | null };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm"
      ? "h-10 w-10 text-sm"
      : size === "lg"
        ? "h-14 w-14 text-xl"
        : "h-12 w-12 text-base";

  if (user.profileImageUrl?.trim()) {
    return (
      <img
        src={user.profileImageUrl}
        alt={getUserDisplayName(user)}
        className={clsx(
          "rounded-2xl border border-white/10 object-cover",
          sizeClass,
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center rounded-2xl border border-white/10 bg-teal-700/20 font-semibold text-white",
        sizeClass,
      )}
      aria-label={getUserDisplayName(user)}
    >
      {getUserAvatarFallback(user)}
    </div>
  );
}

function AvatarUploadInput({
  label,
  userPreview,
  value,
  onChange,
  onError,
}: {
  label: string;
  userPreview: Pick<User, "name" | "email"> & { profileImageUrl?: string | null };
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
}) {
  const inputId = `${label.replace(/\s+/g, "-").toLowerCase()}-upload`;

  async function handleFile(file?: File | null) {
    if (!file) {
      return;
    }

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      onChange(dataUrl);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Failed to upload image.");
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-stone-50 p-4">
      <div className="flex items-center gap-4">
        <UserAvatar user={userPreview} size="lg" />
        <div>
          <p className="text-sm font-medium text-stone-950">{label}</p>
          <p className="mt-1 text-sm text-stone-500">
            Drag and drop an image from your PC, or click to browse. PNG, JPG, or WEBP up to 2 MB.
          </p>
        </div>
      </div>

      <label
        htmlFor={inputId}
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--line)] bg-white px-4 py-6 text-center transition hover:border-teal-300 hover:bg-teal-50/40"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(event) => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            void handleFile(event.target.files?.[0] ?? null);
            event.target.value = "";
          }}
        />
        <p className="text-sm font-medium text-stone-900">Drop image here or click to upload</p>
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
          Drag and drop from PC
        </p>
      </label>

      {value ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3">
          <p className="text-sm text-stone-600">Profile image selected.</p>
          <button
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700"
            type="button"
            onClick={() => onChange("")}
          >
            Remove image
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ProjectCalendarView({
  tasks,
  timeZone,
  language,
  onOpenTask,
}: {
  tasks: Task[];
  timeZone: string;
  language: string;
  onOpenTask: (taskId: number) => void;
}) {
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const datedTask = tasks.find((task) => task.dueDate);
    return datedTask?.dueDate ? new Date(datedTask.dueDate) : new Date();
  });

  const monthStart = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
  const monthEnd = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 0);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const gridDays = Array.from({ length: 42 }, (_, index) => {
    const next = new Date(gridStart);
    next.setDate(gridStart.getDate() + index);
    return next;
  });

  const tasksByDay = new Map<string, Task[]>();

  for (const task of tasks) {
    if (!task.dueDate) {
      continue;
    }

    const dayKey = toCalendarDayKey(task.dueDate, timeZone);
    const existing = tasksByDay.get(dayKey) ?? [];
    existing.push(task);
    tasksByDay.set(dayKey, existing);
  }

  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone-500">
            Project Calendar
          </p>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-semibold text-stone-950">
            <CalendarDays className="h-5 w-5 text-teal-700" />
            {monthStart.toLocaleDateString(language, {
              month: "long",
              year: "numeric",
              timeZone,
            })}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium"
            type="button"
            onClick={() =>
              setCalendarCursor(
                new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1),
              )
            }
          >
            Previous
          </button>
          <button
            className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium"
            type="button"
            onClick={() => setCalendarCursor(new Date())}
          >
            Today
          </button>
          <button
            className="rounded-2xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium"
            type="button"
            onClick={() =>
              setCalendarCursor(
                new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1),
              )
            }
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-3">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="px-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500"
          >
            {day}
          </div>
        ))}
        {gridDays.map((day) => {
          const dayKey = toCalendarDayKey(day.toISOString(), timeZone);
          const dayTasks = tasksByDay.get(dayKey) ?? [];
          const inMonth = day >= monthStart && day <= monthEnd;
          const isToday = toCalendarDayKey(new Date().toISOString(), timeZone) === dayKey;

          return (
            <div
              key={dayKey}
              className={clsx(
                "min-h-36 rounded-[1.25rem] border p-3",
                inMonth
                  ? "border-[var(--line)] bg-stone-50"
                  : "border-dashed border-[var(--line)] bg-stone-50/40 opacity-60",
                isToday && "border-teal-400 bg-teal-50/70",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-900">{day.getDate()}</span>
                {dayTasks.length ? (
                  <span className="rounded-full bg-stone-950 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-white">
                    {dayTasks.length}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 space-y-2">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-left transition hover:border-teal-300 hover:bg-teal-50"
                    onClick={() => onOpenTask(task.id)}
                    type="button"
                  >
                    <p className="truncate text-sm font-medium text-stone-950">{task.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                      {task.status.replaceAll("_", " ")}
                    </p>
                  </button>
                ))}
                {dayTasks.length > 3 ? (
                  <div className="px-2 text-xs font-medium text-stone-500">
                    +{dayTasks.length - 3} more tasks
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectGanttView({
  project,
  tasks,
  timeZone,
  language,
  onOpenTask,
}: {
  project: Project;
  tasks: Task[];
  timeZone: string;
  language: string;
  onOpenTask: (taskId: number) => void;
}) {
  const datedTasks = tasks
    .filter((task) => task.dueDate || task.startedAt || project.startDate || project.createdAt)
    .map((task) => {
      const startDate = new Date(task.startedAt ?? project.startDate ?? project.createdAt);
      const endDate = new Date(task.dueDate ?? task.startedAt ?? project.dueDate ?? project.createdAt);
      return {
        ...task,
        timelineStart: startDate,
        timelineEnd: endDate >= startDate ? endDate : startDate,
      };
    });

  if (!datedTasks.length) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center text-stone-500">
        Add due dates to project tasks to populate the Gantt timeline.
      </div>
    );
  }

  const minStart = new Date(
    Math.min(...datedTasks.map((task) => task.timelineStart.getTime())),
  );
  const maxEnd = new Date(
    Math.max(...datedTasks.map((task) => task.timelineEnd.getTime())),
  );
  const totalDays = Math.max(1, diffInDaysInclusive(minStart, maxEnd));
  const timelineDays = Array.from({ length: totalDays }, (_, index) => {
    const next = new Date(minStart);
    next.setDate(minStart.getDate() + index);
    return next;
  });

  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-stone-500">
            Project Timeline
          </p>
          <h3 className="mt-2 flex items-center gap-2 text-xl font-semibold text-stone-950">
            <GanttChartSquare className="h-5 w-5 text-teal-700" />
            Gantt view
          </h3>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-stone-50 px-4 py-2 text-sm text-stone-600">
          {minStart.toLocaleDateString(language, { day: "2-digit", month: "short", timeZone })} to{" "}
          {maxEnd.toLocaleDateString(language, { day: "2-digit", month: "short", year: "numeric", timeZone })}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div
          className="grid min-w-[920px] gap-3"
          style={{ gridTemplateColumns: `260px repeat(${totalDays}, minmax(32px, 1fr))` }}
        >
          <div className="sticky left-0 z-10 rounded-xl bg-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-stone-500">
            Task
          </div>
          {timelineDays.map((day) => (
            <div
              key={`timeline-head-${day.toISOString()}`}
              className="rounded-xl bg-stone-50 px-1 py-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-stone-500"
            >
              {day.toLocaleDateString(language, { day: "2-digit", month: "short", timeZone })}
            </div>
          ))}

          {datedTasks.map((task) => {
            const startOffset = Math.max(0, diffInDaysInclusive(minStart, task.timelineStart) - 1);
            const span = Math.max(1, diffInDaysInclusive(task.timelineStart, task.timelineEnd));

            return (
              <div key={`row-${task.id}`} className="contents">
                <button
                  className="sticky left-0 z-10 rounded-[1.25rem] border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-teal-300 hover:bg-teal-50"
                  onClick={() => onOpenTask(task.id)}
                  type="button"
                >
                  <p className="font-medium text-stone-950">{task.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                    {task.status.replaceAll("_", " ")} • {task.priority}
                  </p>
                </button>
                <div
                  className="relative col-span-full grid items-center rounded-[1.25rem] bg-stone-50 px-2 py-3"
                  style={{ gridColumn: `2 / span ${totalDays}` }}
                >
                  <div
                    className="grid h-10 items-center"
                    style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(32px, 1fr))` }}
                  >
                    <div
                      className={clsx(
                        "h-7 rounded-full px-3 text-xs font-medium leading-7 text-white shadow-sm",
                        task.status === "DONE"
                          ? "bg-emerald-600"
                          : task.overdue
                            ? "bg-rose-600"
                            : "bg-teal-700",
                      )}
                      style={{
                        gridColumn: `${startOffset + 1} / span ${span}`,
                      }}
                      title={`${task.title}: ${task.timelineStart.toLocaleDateString(language, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone,
                      })} - ${task.timelineEnd.toLocaleDateString(language, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone,
                      })}`}
                    >
                      <span className="truncate">{task.assignee ? getUserDisplayName(task.assignee) : "Unassigned"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "ok" | "warn" | "neutral";
  compact?: boolean;
}) {
  const toneDotClass =
    tone === "ok"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-400"
        : "bg-rose-500";

  return (
    compact ? (
      <div
        className="relative z-20 flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center"
        title={`${label}: ${value}`}
      >
        <Icon className="h-4 w-4" />
        <span className={clsx("h-3 w-3 rounded-full", toneDotClass)} />
      </div>
    ) : (
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <span
          className={clsx(
            "rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.2em]",
            tone === "ok" && "bg-teal-100 text-teal-900",
            tone === "warn" && "bg-amber-100 text-amber-900",
            tone === "neutral" && "bg-stone-200 text-stone-800",
          )}
        >
          {value}
        </span>
      </div>
    )
  );
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <button
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={clsx(
        "w-full rounded-[1.5rem] border border-[var(--line)] bg-stone-950 p-4 text-left text-stone-50 transition hover:-translate-y-0.5",
        isDragging && "opacity-70 shadow-2xl",
      )}
      onClick={onOpen}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{lead.name}</p>
          <p className="mt-1 text-sm text-stone-300">{lead.phone}</p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.2em]">
          {lead.status}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-stone-400">
        <span>{lead.assignedTo?.email || "Assigned"}</span>
        <span>Open</span>
      </div>
    </button>
  );
}

function ProjectTaskCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <button
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={clsx(
        "w-full rounded-[1.5rem] border border-[var(--line)] bg-stone-950 p-4 text-left text-stone-50 transition hover:-translate-y-0.5",
        isDragging && "opacity-70 shadow-2xl",
      )}
      onClick={onOpen}
      type="button"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{task.title}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-stone-300">
            {task.priority} priority
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.18em]">
          {task._count?.subtasks ?? 0} sub
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-stone-400">
        <span>{task.assignee ? getUserDisplayName(task.assignee) : "Unassigned"}</span>
        <span>{task.dueDate ? formatTime(task.dueDate) : "No due"}</span>
      </div>
    </button>
  );
}

function KanbanColumn({
  id,
  title,
  count,
  children,
  pagination,
}: {
  id: string;
  title: string;
  count: number;
  children: React.ReactNode;
  pagination?: {
    page: number;
    totalPages: number;
    onPrevious: () => void;
    onNext: () => void;
  };
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "rounded-[1.5rem] border border-[var(--line)] bg-white/75 p-4 transition",
        isOver && "border-teal-700 bg-teal-50/80",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="rounded-full bg-stone-100 px-2 py-1 font-mono text-xs">
          {count}
        </span>
      </div>
      <div className="mt-4 space-y-3">{children}</div>
      {pagination ? (
        <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3">
          <button
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={pagination.onPrevious}
            disabled={pagination.page <= 1}
          >
            Previous
          </button>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            className="rounded-xl border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={pagination.onNext}
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AccordionSection({
  title,
  icon: Icon,
  defaultOpen,
  className,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={clsx(
        "group rounded-[1.5rem] border border-[var(--line)] bg-white/80",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-medium marker:content-none">
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-teal-700" />
          {title}
        </span>
        <ChevronDown className="h-4 w-4 text-stone-500 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-[var(--line)] px-4 py-4">{children}</div>
    </details>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchableSelectInput({
  label,
  value,
  onChange,
  options,
  searchPlaceholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption =
    options.find((option) => option.value === value) ?? {
      label: value || "Select an option",
      value,
    };

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(query),
    );
  }, [options, search]);

  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <div className="relative">
        <button
          className="flex h-12 w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 text-left"
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <span className="truncate">{selectedOption.label}</span>
          <ChevronDown
            className={clsx("h-4 w-4 text-stone-500 transition", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-[1.25rem] border border-[var(--line)] bg-white p-3 shadow-[0_20px_40px_rgba(23,18,13,0.12)]">
            <div className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--line)] px-3">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                autoFocus
                className="w-full bg-transparent text-sm outline-none"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="mt-3 max-h-72 overflow-y-auto">
              {filteredOptions.map((option) => (
                <button
                  key={`${label}-${option.value}`}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-stone-50",
                    option.value === value && "bg-teal-50 text-teal-900",
                  )}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  <span className="font-mono text-xs text-stone-500">{option.value}</span>
                </button>
              ))}
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-stone-500">
                  No currencies match your search.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
}

function DepartmentAssignmentsEditor({
  assignments,
  onChange,
  organizationDepartments,
}: {
  assignments: Array<{ departmentName: string; positionTitle: string }>;
  onChange: (
    assignments: Array<{ departmentName: string; positionTitle: string }>,
  ) => void;
  organizationDepartments: OrganizationDepartment[];
}) {
  const safeAssignments = assignments.length
    ? assignments
    : [{ departmentName: "", positionTitle: "" }];

  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-stone-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-950">Departments & positions</p>
          <p className="mt-1 text-sm text-stone-500">
            Team members can hold multiple positions across departments.
          </p>
        </div>
        <button
          className="rounded-2xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-stone-800"
          type="button"
          onClick={() =>
            onChange([...assignments, { departmentName: "", positionTitle: "" }])
          }
        >
          Add assignment
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {safeAssignments.map((assignment, index) => {
          const matchingDepartment = organizationDepartments.find(
            (department) =>
              department.name.toLowerCase() === assignment.departmentName.trim().toLowerCase(),
          );
          const positionSuggestions = matchingDepartment?.positions.map((position) => position.title) ?? [];

          return (
            <div
              key={`assignment-${index}`}
              className="grid gap-3 rounded-[1.25rem] border border-[var(--line)] bg-white p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <SelectInput
                label="Department"
                value={assignment.departmentName}
                onChange={(value) =>
                  onChange(
                    safeAssignments.map((item, itemIndex) =>
                      itemIndex === index
                        ? { departmentName: value, positionTitle: "" }
                        : item,
                    ),
                  )
                }
                options={[
                  { label: "Select department", value: "" },
                  ...organizationDepartments.map((department) => ({
                    label: department.name,
                    value: department.name,
                  })),
                ]}
              />

              <SelectInput
                label="Position"
                value={assignment.positionTitle}
                onChange={(value) =>
                  onChange(
                    safeAssignments.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, positionTitle: value }
                        : item,
                    ),
                  )
                }
                options={[
                  { label: matchingDepartment ? "Select position" : "Select department first", value: "" },
                  ...positionSuggestions.map((positionTitle) => ({
                    label: positionTitle,
                    value: positionTitle,
                  })),
                ]}
              />

              <div className="flex items-end">
                <button
                  className="h-12 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700"
                  type="button"
                  onClick={() =>
                    onChange(
                      safeAssignments.length === 1
                        ? []
                        : safeAssignments.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  label,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  if (total <= pageSize) {
    return null;
  }

  return (
    <div className={clsx("flex items-center justify-between gap-4", className)}>
      <p className="text-sm text-stone-500">
        Showing {start}-{end} of {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          Previous
        </button>
        <span className="min-w-20 text-center text-sm font-medium text-stone-700">
          Page {safePage} / {totalPages}
        </span>
        <button
          className="rounded-2xl border border-[var(--line)] px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function DateTimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PhoneInput({
  label,
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
}: {
  label: string;
  countryCode: string;
  phone: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption =
    COUNTRY_CODE_OPTIONS.find((option) => option.value === countryCode) ?? {
      label: `Custom (${countryCode})`,
      value: countryCode,
    };

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return COUNTRY_CODE_OPTIONS;
    }

    return COUNTRY_CODE_OPTIONS.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(query),
    );
  }, [search]);

  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <div className="grid grid-cols-[190px_minmax(0,1fr)] gap-3">
        <div className="relative">
          <button
            className="flex h-12 w-full items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 text-left"
            type="button"
            onClick={() => setOpen((current) => !current)}
          >
            <span className="truncate">{selectedOption.label}</span>
            <ChevronDown
              className={clsx("h-4 w-4 text-stone-500 transition", open && "rotate-180")}
            />
          </button>

          {open ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-[1.25rem] border border-[var(--line)] bg-white p-3 shadow-[0_20px_40px_rgba(23,18,13,0.12)]">
              <div className="flex h-11 items-center gap-2 rounded-2xl border border-[var(--line)] px-3">
                <Search className="h-4 w-4 text-stone-500" />
                <input
                  autoFocus
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search country or code"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto">
                {filteredOptions.map((option) => (
                  <button
                    key={`${option.label}-${option.value}`}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-stone-50",
                      option.value === countryCode && "bg-teal-50 text-teal-900",
                    )}
                    type="button"
                    onClick={() => {
                      onCountryCodeChange(option.value);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <span>{option.label}</span>
                    <span className="font-mono text-xs text-stone-500">{option.value}</span>
                  </button>
                ))}
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-stone-500">
                    No countries match your search.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <input
          className="h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4"
          inputMode="tel"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, ""))}
          placeholder="Phone number"
        />
      </div>
    </label>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
