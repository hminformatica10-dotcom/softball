import React, { useState, useEffect, useRef } from 'react';
import { t } from './translations';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { jwtDecode } from 'jwt-decode';
import { Users, User, TrendingUp, Sliders, Trash2, Activity, Home, DollarSign, CreditCard, BarChart2, PlusCircle, Edit2, AlertCircle, Search, Settings, Calendar, ClipboardCheck, Menu, X, Wifi, WifiOff, Lock, ShieldCheck, Eye, EyeOff, Sun, Moon, Key, ChevronRight, Fingerprint, RefreshCw } from 'lucide-react';
import type { Player, Payment, Expense, Game, AppConfig, PaymentConcept } from './types';
import { isOlderThan24h } from './utils';
import { DashboardTab } from './components/tabs/DashboardTab';
import { PlayersTab } from './components/tabs/PlayersTab';
import { GamesTab } from './components/tabs/GamesTab';
import { PaymentsTab } from './components/tabs/PaymentsTab';
import { ExpensesTab } from './components/tabs/ExpensesTab';
import { AttendanceTab } from './components/tabs/AttendanceTab';
import { DebtsTab } from './components/tabs/DebtsTab';
import { ReportsTab } from './components/tabs/ReportsTab';


const getTodayString = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatToInputDate = (dateString: string) => {
  if (!dateString) return '';
  if (dateString.length === 10 && dateString.includes('-')) return dateString;
  if (dateString.includes('T12:00:00.000Z')) return dateString.split('T')[0];
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const normalizeDate = (dateString: string) => {
  if (!dateString) {
    const today = new Date().toISOString().split('T')[0];
    return today + 'T12:00:00.000Z';
  }
  // Force midday to avoid timezone shifts during normalization
  const dateStr = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  return dateStr + 'T12:00:00.000Z';
};

const formatDate = (dateInput: string) => {
  if (!dateInput) return '';
  try {
    let isoString = '';
    if (dateInput.includes('T00:00:00')) {
      isoString = dateInput.split('T')[0] + 'T12:00:00';
    } else if (dateInput.length === 10 && dateInput.includes('-')) {
      isoString = dateInput + 'T12:00:00';
    } else {
      isoString = dateInput;
    }

    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return '';
  }
};

const primaryApiUrl = import.meta.env.VITE_API_URL || '';
const localFallbackUrls = [
  import.meta.env.VITE_LOCAL_API_URL,
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://10.0.2.2:5000'
].filter(Boolean) as string[];

console.log('[DEBUG] Variables de entorno:');
console.log(`  VITE_API_URL: "${import.meta.env.VITE_API_URL}"`);
console.log(`  VITE_LOCAL_API_URL: "${import.meta.env.VITE_LOCAL_API_URL}"`);
console.log(`  primaryApiUrl: "${primaryApiUrl}"`);
console.log(`  localFallbackUrls: [${localFallbackUrls.join(', ')}]`);

const testServerUrl = async (baseUrl: string) => {
  console.log(`[DEBUG] testServerUrl recibió baseUrl: "${baseUrl}"`);
  if (!baseUrl) {
    console.log('[DEBUG] testServerUrl: baseUrl está vacío');
    return false;
  }
  const healthUrl = baseUrl.replace(/\/$/, '') + '/api/health';
  console.log(`[DEBUG] healthUrl construido: "${healthUrl}"`);
  console.log('\n===== CONEXIÓN AL BACKEND =====');
  console.log(`[INFO] Intentando conectar a: ${healthUrl}`);
  console.log(`[INFO] Plataforma: ${Capacitor.isNativePlatform() ? 'ANDROID/iOS' : 'NAVEGADOR'}`);
  console.log('==============================\n');
  
  try {
    const startTime = performance.now();
    console.log(`[DEBUG] Enviando request a ${healthUrl}...`);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    
    if (response.ok) {
      console.log(`✅ [SUCCESS] Conexión exitosa con backend en: ${healthUrl}`);
      console.log(`[INFO] Status: ${response.status} | Tiempo: ${duration}ms`);
      const text = await response.text();
      console.log(`[INFO] Respuesta: ${text}\n`);
    } else {
      console.warn(`❌ [ERROR] Respuesta no OK del backend`);
      console.warn(`[INFO] URL: ${healthUrl}`);
      console.warn(`[INFO] Status: ${response.status} | Tiempo: ${duration}ms\n`);
    }
    return response.ok;
  } catch (error: any) {
    console.error(`❌ [ERROR] Falló la conexión con backend`);
    console.error(`[INFO] URL intentada: ${healthUrl}`);
    console.error(`[INFO] Tipo de error: ${error?.name}`);
    console.error(`[INFO] Mensaje: ${error?.message}`);
    console.error(`[INFO] Detalles:`, error);
    console.error('\n');
    return false;
  }
};

const isWebBrowser = !Capacitor.isNativePlatform();
const genericBrowserUser = {
  sub: 'softball_generic_user',
  name: 'Usuario Genérico',
  email: 'usuario@softball.local',
  picture: '',
  aud: 'softball_report'
};

const DEBUG_SHA1 = '91:31:36:9D:40:2C:A8:D5:2D:F1:57:1E:01:29:97:69:FF:72:A0:39';
const RELEASE_SHA1 = 'BF:AA:96:41:D1:44:E3:9D:7B:CC:D3:96:9B:D8:98:B9:BF:27:A8:DE';

function App() {
  const [apiUrl, setApiUrl] = useState(() => {
    const initialUrl = primaryApiUrl || localFallbackUrls[0] || '';
    if (!initialUrl) {
      throw new Error('No se pudo resolver la URL de la API. Define VITE_API_URL o VITE_LOCAL_API_URL.');
    }
    return initialUrl;
  });
  const [apiUrlSource, setApiUrlSource] = useState<'AWS' | 'LOCAL'>(primaryApiUrl ? 'AWS' : 'LOCAL');
  const preferredApiUrl = primaryApiUrl;
  const fallbackApiUrls = localFallbackUrls;

  const resolveApiUrlFromConnectivity = async () => {
    console.log('\n\n🔍 [INICIO] Resolviendo URL de API...');
    console.log(`[DEBUG] preferredApiUrl: "${preferredApiUrl}"`);
    console.log(`[DEBUG] fallbackApiUrls: [${fallbackApiUrls.join(', ')}]`);
    console.log(`[INFO] URLs disponibles:`);
    console.log(`  - AWS URL: ${preferredApiUrl || 'NO CONFIGURADA'}`);
    console.log(`  - Fallback URLs: [${fallbackApiUrls.join(', ')}]\n`);
    
    if (preferredApiUrl) {
      console.log(`[INTENTO 1] Probando URL de AWS: ${preferredApiUrl}`);
      if (await testServerUrl(preferredApiUrl)) {
        setApiUrl(preferredApiUrl);
        setApiUrlSource('AWS');
        console.log(`✅ [EXITO] Usando API de AWS: ${preferredApiUrl}\n`);
        return true;
      }
    } else {
      console.log(`[SKIP] No hay URL de AWS configurada\n`);
    }

    console.log(`[INTENTO 2] Probando URLs fallback...`);
    for (let i = 0; i < fallbackApiUrls.length; i++) {
      const localUrl = fallbackApiUrls[i];
      if (localUrl) {
        console.log(`  [${i + 1}/${fallbackApiUrls.length}] Probando: ${localUrl}`);
        if (await testServerUrl(localUrl)) {
          setApiUrl(localUrl);
          setApiUrlSource('LOCAL');
          console.log(`✅ [EXITO] Usando API local: ${localUrl}\n`);
          return true;
        }
      }
    }

    console.error(`❌ [FATAL] No se pudo conectar a NINGUNA URL de API`);
    console.error(`Verifica que el backend esté corriendo y sea accesible.\n`);
    return false;
  };

  // Log de inicialización solo una vez
  useEffect(() => {
    console.log('App: Componente App inicializado');
    console.log('App: API URL configurada:', apiUrl, 'Fuente:', apiUrlSource);
  }, []); // Solo se ejecuta una vez al montar el componente

  const API_URL = `${apiUrl}/api/players`;
  const PAYMENT_API_URL = `${apiUrl}/api/payments`;
  const EXPENSE_API_URL = `${apiUrl}/api/expenses`;
  const GAME_API_URL = `${apiUrl}/api/games`;
  const TEAM_API_URL = `${apiUrl}/api/teams`;
  const CONCEPT_API_URL = `${apiUrl}/api/payment-concepts`;

  const [user, setUser] = useState<any>(null); // Auth State
  const [activeTab, setActiveTab] = useState('Inicio');
  const [googleAuthFailed, setGoogleAuthFailed] = useState(false);
  const [googleAuthErrorMsg, setGoogleAuthErrorMsg] = useState('');

  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [games, setGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);

  const [paymentConcepts, setPaymentConcepts] = useState<PaymentConcept[]>([]);
  const [loadingConcepts, setLoadingConcepts] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    jerseyNumber: '',
    position: '',
    battingHand: 'Right',
    photo: ''
  });

  const [paymentFormData, setPaymentFormData] = useState({
    playerId: '',
    amount: '',
    description: '',
    otherDescription: '',
    abonoDescription: '',
    notes: '',
    gameId: '',
    eventDate: ''
  });

  const [expenseFormData, setExpenseFormData] = useState({
    category: '',
    otherCategory: '',
    amount: '',
    description: '',
    receipt: '',
    eventDate: getTodayString()
  });

  const [gameFormData, setGameFormData] = useState({
    opponent: '',
    eventDate: getTodayString(),
    time: '',
    location: '',
    result: 'Pendiente'
  });

  // PIN Security State - RESTORED & ENHANCED
  const [isLocked, setIsLocked] = useState(() => !!localStorage.getItem('softball_app_pin'));
  const [pinSetupMode, setPinSetupMode] = useState(false);
  const [pinStep, setPinStep] = useState(1);
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [changingPinMode, setChangingPinMode] = useState(false);
  const [oldPinInput, setOldPinInput] = useState('');

  // New Lock Screen UI States
  const [showPin, setShowPin] = useState(false);


  // Inactivity Timer - RESTORED
  useEffect(() => {
    let inactivityTimer: any;
    const INACTIVITY_LIMIT = 5 * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      if (user && localStorage.getItem('softball_app_pin') && !isLocked && !pinSetupMode) {
        inactivityTimer = setTimeout(() => {
          setIsLocked(true);
        }, INACTIVITY_LIMIT);
      }
    };

    resetTimer();

    const events = ['mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetTimer));

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user, isLocked, pinSetupMode]);

  // PIN Setup - RESTORED
  useEffect(() => {
    if (user && !localStorage.getItem('softball_app_pin') && !pinSetupMode) {
      setPinSetupMode(true);
      setPinStep(1);
    }
  }, [user, pinSetupMode]);

  // Teams and Multi-Team State
  const [teams, setTeams] = useState<any[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<string>(localStorage.getItem('softball_active_team') || '');
  const [, setLoadingTeams] = useState(true);

  // App Configuration State
  const [configRaw, setConfigRaw] = useState<AppConfig>({
    teamName: 'Equipo',
    primaryColor: '#38bdf8',
    language: 'es',
    currency: 'USD'
  });

  const activeTeam = teams.find(t => t.id === activeTeamId) || configRaw;
  const config = {
    teamName: activeTeam.name || activeTeam.teamName,
    primaryColor: activeTeam.primaryColor || '#38bdf8',
    language: configRaw.language || 'es',
    currency: configRaw.currency || 'USD',
    adminPassword: activeTeam.adminPassword || 'admin123'
  };

  const theme: 'dark' | 'light' = 'dark';

  // --- Efecto para Aplicar Tema ---
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);

    // Adaptar StatusBar si es dispositivo móvil
    const adaptStatusBar = async () => {
      try {
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) { }
    };
    adaptStatusBar();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newTeamModalOpen, setNewTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  // Edit & Delete Modal States
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: string, id: string }>({ isOpen: false, type: '', id: '' });
  const [confirmActionModal, setConfirmActionModal] = useState<{ isOpen: boolean, title: string, message: string, requiresInput?: boolean, inputLabel?: string, onConfirm: (val?: string) => void }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });
  const [confirmActionInput, setConfirmActionInput] = useState('');
  const [editModal, setEditModal] = useState<{ isOpen: boolean, type: string, data: any }>({ isOpen: false, type: '', data: null });
  const [securityChallenge, setSecurityChallenge] = useState<{ isOpen: boolean, onVerified: () => void }>({ isOpen: false, onVerified: () => { } });
  const [securityPasswordInput, setSecurityPasswordInput] = useState('');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(localStorage.getItem('softball_admin_recovery') === 'true');
  const [pwdForm, setPwdForm] = useState({ old: '', new: '', confirm: '', show: false });
  const [pwdVisibility, setPwdVisibility] = useState({ old: false, new: false, confirm: false, challenge: false });
  const [quickPaymentModal, setQuickPaymentModal] = useState<{ isOpen: boolean, player: Player | null, gameDateStr: string, rawDate: string, opponent: string, amount: string }>({ isOpen: false, player: null, gameDateStr: '', rawDate: '', opponent: '', amount: '' });
  const [isPlayerPaymentsModalOpen, setIsPlayerPaymentsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Search & Date Filters
  const [playerSearch, setPlayerSearch] = useState('');
  const [paymentSearchConcept, setPaymentSearchConcept] = useState('Todos');
  const [paymentControlGameId, setPaymentControlGameId] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [gameSearch, setGameSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportType, setReportType] = useState('Todos');
  const [reportPlayerFilter, setReportPlayerFilter] = useState('');
  const [chartView, setChartView] = useState('Ninguno');
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const [isReportFilterModalOpen, setIsReportFilterModalOpen] = useState(false);
  const [tempReportPlayerFilter, setTempReportPlayerFilter] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [tempReportType, setTempReportType] = useState('Todos');
  const [reportSpecificDate, setReportSpecificDate] = useState('');
  const [tempReportSpecificDate, setTempReportSpecificDate] = useState('');

  const openReportFilterModal = () => {
    setTempReportPlayerFilter('');
    setTempStartDate('');
    setTempEndDate('');
    setTempReportType('Todos');
    setTempReportSpecificDate('');
    setIsReportFilterModalOpen(true);
  };

  const openDateFilterModal = () => {
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setFilterYear('');
    setIsDateFilterModalOpen(true);
  };

  const handleApplyReportFilters = () => {
    setReportPlayerFilter(tempReportPlayerFilter);
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setReportType(tempReportType);
    setReportSpecificDate(tempReportSpecificDate);
    setIsReportFilterModalOpen(false);
  };

  const handleClearReportFilters = () => {
    setTempReportPlayerFilter('');
    setTempStartDate('');
    setTempEndDate('');
    setTempReportType('Todos');
    setTempReportSpecificDate('');

    setReportPlayerFilter('');
    setStartDate('');
    setEndDate('');
    setReportType('Todos');
    setReportSpecificDate('');
  };

  // Helper para extraer YYYY-MM-DD de forma consistente
  const getYYYYMMDD = (dateString: string) => {
    if (!dateString) return '';
    try {
      if (dateString.includes('T')) return dateString.split('T')[0];
      if (dateString.length === 10 && dateString.includes('-')) return dateString;
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) { return ''; }
  };

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const isSyncingRef = useRef(false);

  // Función para verificar conectividad real con AWS primero, luego con local
  const checkRealConnectivity = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('[APP] Verificando conectividad real con AWS y fallback local');
    const reachable = await resolveApiUrlFromConnectivity();
    console.log(`[APP] URL activa tras verificación: ${apiUrl}`);
    console.log(`[APP] Fuente: ${apiUrlSource}`);
    console.log(`[APP] Backend alcanzable: ${reachable ? '✅ SI' : '❌ NO'}`);
    console.log('='.repeat(60) + '\n');
    return reachable;
  };

  const buildApiUrl = (base: string, path: string) => {
    if (path.startsWith('http')) return path;
    return base.replace(/\/$/, '') + (path.startsWith('/') ? '' : '/') + path;
  };

  const fetchWithFallback = async (path: string, options: RequestInit = {}) => {
    const candidates = [apiUrl];
    if (apiUrlSource === 'AWS') {
      for (const localUrl of fallbackApiUrls) {
        if (localUrl && !candidates.includes(localUrl)) {
          candidates.push(localUrl);
        }
      }
    } else if (preferredApiUrl && !candidates.includes(preferredApiUrl)) {
      candidates.unshift(preferredApiUrl);
    }

    console.log(`[FETCH] Petición a: ${path} | Intentos: ${candidates.length}`);
    let lastError: any = null;
    for (let i = 0; i < candidates.length; i++) {
      const base = candidates[i];
      const url = buildApiUrl(base, path);
      try {
        console.log(`  [${i + 1}/${candidates.length}] GET ${url}`);
        const startTime = performance.now();
        const res = await fetch(url, options);
        const duration = (performance.now() - startTime).toFixed(2);

        if (res.ok) {
          console.log(`    ✅ Status: ${res.status} | Tiempo: ${duration}ms`);
          if (base === preferredApiUrl && apiUrlSource !== 'AWS') {
            setApiUrl(base);
            setApiUrlSource('AWS');
          } else if (base !== preferredApiUrl && apiUrlSource !== 'LOCAL') {
            setApiUrl(base);
            setApiUrlSource('LOCAL');
          }
          return res;
        }

        console.warn(`    ⚠️ Status: ${res.status} | Tiempo: ${duration}ms`);
        if (res.status >= 500) {
          lastError = new Error(`Server error ${res.status}`);
          continue;
        }

        return res;
      } catch (err: any) {
        console.error(`    ❌ Error: ${err?.message}`);
        lastError = err;
      }
    }

    console.error(`[FETCH] ❌ No se pudo conectar a ninguna URL de: ${path}`);
    throw lastError || new Error('fetchWithFallback: No se pudo conectar a ninguna URL');
  };

  // --- Sistema de Detección de Conexión Robusto ---
  useEffect(() => {
    console.log('App: Iniciando useEffect de detección de conexión');
    let isMounted = true;

    const checkConnectivity = async () => {
      const navigatorOnline = navigator.onLine;
      console.log('App: Verificando conectividad - navigator.onLine:', navigatorOnline);

      // Si navigator dice que está offline, no hay conexión
      if (!navigatorOnline) {
        if (isMounted) setIsOnline(false);
        return;
      }

      // Si navigator dice que está online, verificar con el servidor
      const serverReachable = await checkRealConnectivity();
      console.log('App: Servidor reachable:', serverReachable);

      if (isMounted) {
        setIsOnline(serverReachable);
        setServerUnavailable(!serverReachable);
      }
    };

    const handleOnline = async () => {
      console.log('App: Evento online detectado');
      const serverReachable = await checkRealConnectivity();
      console.log('App: Servidor reachable tras evento online:', serverReachable);

      if (isMounted) {
        setIsOnline(serverReachable);
        setServerUnavailable(!serverReachable);
      }

      // Si hay conexión real al servidor y hay acciones pendientes, sincronizar
      if (serverReachable && offlineSyncQueue.length > 0) {
        console.log('App: Hay acciones pendientes, iniciando sync inmediato tras reconexión');
        setTimeout(() => processSyncQueue(), 1000);
      }
    };

    const handleOffline = () => {
      console.log('App: Evento offline detectado');
      if (isMounted) {
        setIsOnline(false);
        setServerUnavailable(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificación periódica cada 30 segundos
    const interval = setInterval(checkConnectivity, 30000);

    // Verificación inicial
    checkConnectivity();

    return () => {
      console.log('App: Limpiando useEffect de conexión');
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [apiUrl]);

  // Inicializar cola offline desde localStorage
  const [offlineSyncQueue, setOfflineSyncQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('softball_sync_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('App: Error cargando cola offline:', e);
      return [];
    }
  });

  // Limpiar campos y filtros de todas las ventanas al cambiar de pestaña
  useEffect(() => {
    // 1. Limpiar Formularios
    setPaymentFormData({
      playerId: '', amount: '', description: '', otherDescription: '', abonoDescription: '', notes: '', gameId: '', eventDate: ''
    });
    setFormData({ name: '', jerseyNumber: '', position: '', battingHand: 'Right', photo: '' });
    setExpenseFormData({ category: '', otherCategory: '', amount: '', description: '', receipt: '', eventDate: getTodayString() });
    setGameFormData({ opponent: '', eventDate: getTodayString(), time: '', location: '', result: 'Pendiente' });
    setPaymentControlGameId('');

    // 2. Limpiar Búsquedas de Texto
    setPlayerSearch('');
    setPaymentSearch('');
    setGameSearch('');
    setReportSearch('');

    // 3. Limpiar Filtros de Fecha (Globales y de Juego)
    setSingleDate('');
    setFilterYear('');
    setStartDate('');
    setEndDate('');

    // 4. Limpiar Filtros de Reportes (Aplicados y Temporales)
    setReportType('Todos');
    setReportPlayerFilter('');
    setReportSpecificDate('');

    setTempReportPlayerFilter('');
    setTempStartDate('');
    setTempEndDate('');
    setTempReportType('Todos');
    setTempReportSpecificDate('');

    setPaymentSearchConcept('Todos');
  }, [activeTab]);

  const positions = ['Pitcher', 'Catcher', 'First Base', 'Infield', 'Outfield', 'Designated Hitter'];
  const expenseCategories = ['Arbitraje', 'Bolas', 'Pago de Terreno', 'Bebidas/Comida', 'Equipo', 'Otro'];

  // Auth Effect
  useEffect(() => {
    console.log('App: Iniciando useEffect de autenticación');
    const initCapacitor = async () => {
      try {
        console.log('App: Inicializando Capacitor - StatusBar');
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        await StatusBar.setStyle({ style: Style.Dark });
        console.log('App: StatusBar inicializado correctamente');
      } catch (e) {
        console.error('App: Error inicializando StatusBar:', e);
      }
    };
    initCapacitor();

    const storedUser = localStorage.getItem('softball_user');
    console.log('App: Usuario almacenado:', storedUser ? 'Sí' : 'No');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser) {
          setUser(parsedUser);
          if (isOnline) {
            setTimeout(() => processSyncQueue(), 1000);
          }
        }
      } catch(e) {}
    }

    const savedConfig = localStorage.getItem('softball_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed) setConfigRaw(parsed);
      } catch(e) {}
    }
    console.log('App: useEffect de autenticación completado');
  }, []);

  // Efecto para establecer la fecha del último juego como valor por defecto para nuevos pagos
  useEffect(() => {
    if (games.length > 0 && (!paymentFormData.eventDate || paymentFormData.eventDate === '')) {
      const lastGame = [...games].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime())[0];
      if (lastGame && lastGame.eventDate) {
        setPaymentFormData(prev => ({ ...prev, eventDate: lastGame.eventDate.split('T')[0] }));
      }
    }
  }, [games, paymentFormData.eventDate]);

  useEffect(() => {
    let listener: any;
    const registerBackButton = async () => {
      listener = await CapApp.addListener('backButton', () => {
        if (isSettingsOpen) { setIsSettingsOpen(false); return; }
        if (newTeamModalOpen) { setNewTeamModalOpen(false); return; }
        if (deleteModal.isOpen) { setDeleteModal({ isOpen: false, type: '', id: '' }); return; }
        if (confirmActionModal.isOpen) { setConfirmActionModal({ ...confirmActionModal, isOpen: false }); return; }
        if (editModal.isOpen) { setEditModal({ isOpen: false, type: '', data: null }); return; }
        if (quickPaymentModal.isOpen) { setQuickPaymentModal({ isOpen: false, player: null, gameDateStr: '', rawDate: '', opponent: '', amount: '' }); return; }
        if (isDateFilterModalOpen) { setIsDateFilterModalOpen(false); return; }
        if (isReportFilterModalOpen) {
          setIsReportFilterModalOpen(false);
          setTempReportPlayerFilter('');
          setTempStartDate('');
          setTempEndDate('');
          setTempReportType('Todos');
          setTempReportSpecificDate('');
          return;
        }
        if (isMobileMenuOpen) { setIsMobileMenuOpen(false); return; }

        if (activeTab !== 'Inicio') {
          setActiveTab('Inicio');
          return;
        }
        CapApp.exitApp();
      });
    };
    registerBackButton();

    return () => {
      if (listener) listener.remove();
    };
  }, [isSettingsOpen, newTeamModalOpen, deleteModal.isOpen, editModal.isOpen, quickPaymentModal.isOpen, isDateFilterModalOpen, isReportFilterModalOpen, isMobileMenuOpen, activeTab]);

  useEffect(() => {
    console.log('App: useEffect de fetch datos - user:', !!user, 'activeTeamId:', activeTeamId);
    if (user && activeTeamId) {
      console.log('App: Iniciando fetch de datos');
      fetchPlayers();
      fetchPayments();
      fetchExpenses();
      fetchGames();
      console.log('App: Fetch de datos completado');
    } else {
      console.log('App: No se ejecuta fetch - falta user o activeTeamId');
    }
  }, [user, activeTeamId]);

  useEffect(() => {
    const act = teams.find(t => t.id === activeTeamId);
    if (act) {
      setConfigRaw(prev => ({ ...prev, teamName: act.name, primaryColor: act.primaryColor }));
    }
  }, [activeTeamId, teams]);



  const handleNativeLogin = async () => {
    setGoogleAuthFailed(false);
    setGoogleAuthErrorMsg('');

    if (isWebBrowser) {
      console.log('App: Navegador detectado, usando usuario genérico en lugar de Google Auth');
      setUser(genericBrowserUser);
      localStorage.setItem('softball_user', JSON.stringify(genericBrowserUser));

      if (localStorage.getItem('softball_admin_recovery') === 'true') {
        setIsRecoveryMode(true);
        setIsSettingsOpen(true);
      }

      if (isOnline) {
        setTimeout(() => processSyncQueue(), 500);
      }
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      alert('Google Auth sólo funciona en la app nativa.');
      return;
    }

    try {
      await GoogleAuth.initialize({
        clientId: '333160410955-o1hniu53nondfvfrh28udqaa2n661540.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      const result = await GoogleAuth.signIn();
      if (!result || !result.authentication?.idToken) {
        throw new Error('Google Auth no devolvió token de identidad válido.');
      }

      const decoded = jwtDecode(result.authentication.idToken);
      setUser(decoded);
      localStorage.setItem('softball_user', JSON.stringify(decoded));

      if (localStorage.getItem('softball_admin_recovery') === 'true') {
        setIsRecoveryMode(true);
        setIsSettingsOpen(true);
      }

      if (isOnline) {
        setTimeout(() => processSyncQueue(), 500);
      }
    } catch (err: any) {
      console.error('Google Native Login Failed:', err);
      const message = err.message || JSON.stringify(err);
      setGoogleAuthFailed(true);
      setGoogleAuthErrorMsg(message);
      alert(
        'Error Google Auth: ' + message + '\n\n' +
        'Registra los SHA-1 correctos para el paquete com.zeratyx.softball en Google Cloud.\n' +
        'SHA-1 debug: ' + DEBUG_SHA1 + '\n' +
        'SHA-1 release: ' + RELEASE_SHA1 + '\n\n' +
        'Si quieres continuar sin Google Auth, usa el botón alternativo disponible después del fallo.'
      );
    }
  };

  const handleNativeLoginFallback = async () => {
    setUser(genericBrowserUser);
    localStorage.setItem('softball_user', JSON.stringify(genericBrowserUser));

    if (localStorage.getItem('softball_admin_recovery') === 'true') {
      setIsRecoveryMode(true);
      setIsSettingsOpen(true);
    }

    if (isOnline) {
      setTimeout(() => processSyncQueue(), 500);
    }
  };

  const logout = async () => {
    try { await GoogleAuth.signOut(); } catch (e) { }
    setUser(null);
    setPlayers([]);
    setPayments([]);
    setExpenses([]);
    setGames([]);
    localStorage.removeItem('softball_user');
  };

  const saveConfig = async (newConfig: any) => {
    setConfigRaw(newConfig);
    localStorage.setItem('softball_config', JSON.stringify(newConfig));
    localStorage.setItem('softball_api_url', apiUrl);

    if (activeTeamId) {
      const updatedTeam = {
        id: activeTeamId,
        name: newConfig.teamName,
        primaryColor: newConfig.primaryColor
      };
      setTeams((prev: any[]) => {
        const next = prev.map(team => team.id === activeTeamId ? { ...team, ...updatedTeam } : team);
        localStorage.setItem('softball_teams', JSON.stringify(next));
        return next;
      });

      if (isOnline) {
        try {
          await fetch(`${TEAM_API_URL}/${activeTeamId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              name: newConfig.teamName,
              primaryColor: newConfig.primaryColor,
              adminPassword: newConfig.adminPassword
            })
          });
        } catch (err) {
          console.warn('App: saveConfig - no se pudo actualizar el equipo en el servidor, se mantendrá localmente.', err);
        }
        fetchTeams();
      }
    }

    setIsSettingsOpen(false);
  };

  const handleAdminPasswordChange = async () => {
    if (isRecoveryMode) {
      if (!pwdForm.new || pwdForm.new !== pwdForm.confirm) {
        alert("Las contraseñas no coinciden o están vacías.");
        return;
      }
    } else {
      if (pwdForm.old !== config.adminPassword) {
        alert("La contraseña actual es incorrecta.");
        return;
      }
      if (!pwdForm.new || pwdForm.new !== pwdForm.confirm) {
        alert("Las nuevas contraseñas no coinciden.");
        return;
      }
    }

    const updatedConfig = { ...configRaw, adminPassword: pwdForm.new };
    await saveConfig(updatedConfig);

    setPwdForm({ old: '', new: '', confirm: '', show: false });
    setIsRecoveryMode(false);
    localStorage.removeItem('softball_admin_recovery');
    alert("Contraseña administrativa actualizada correctamente.");
  };

  const handleForgotAdminPassword = () => {
    if (confirm("Para recuperar tu contraseña administrativa deberás volver a iniciar sesión con Google para verificar tu identidad. ¿Continuar?")) {
      localStorage.setItem('softball_admin_recovery', 'true');
      logout();
    }
  };

  // Auth Header Generator
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'x-user-id': user?.sub || '',
      'x-team-id': activeTeamId || ''
    };
  };

  // --- LÓGICA DE SINCRONIZACIÓN OFFLINE ---
  useEffect(() => {
    const savedQueue = localStorage.getItem('softball_sync_queue');
    if (savedQueue) {
      const parsedQueue = JSON.parse(savedQueue);
      setOfflineSyncQueue(parsedQueue);
      if (navigator.onLine && parsedQueue.length > 0) {
        setTimeout(() => processSyncQueue(), 2000); // Wait a bit for auth/state
      }
    }
  }, []);

  const saveToQueueAndStorage = (action: any) => {
    console.log('App: Guardando acción en cola:', action);

    // Convertir URL completa a relativa si es necesario
    const relativeUrl = action.url.startsWith(apiUrl) ? action.url.substring(apiUrl.length) : action.url;

    // Actualizar estado y localStorage
    setOfflineSyncQueue(prev => {
      const newQueue = [...prev, { ...action, url: relativeUrl }];
      console.log('App: Cola actualizada:', newQueue.length, 'items');
      localStorage.setItem('softball_sync_queue', JSON.stringify(newQueue));
      return newQueue;
    });

    // Si estamos online, intentar sincronizar inmediatamente
    if (isOnline && !isSyncingRef.current) {
      console.log('App: Online detectado, intentando sync inmediato');
      setTimeout(() => processSyncQueue(), 500);
    }
  };

  const processSyncQueue = async () => {
    if (isSyncingRef.current) {
      console.log('App: processSyncQueue ya está ejecutándose, saltando');
      return;
    }

    const currentQueue = JSON.parse(localStorage.getItem('softball_sync_queue') || '[]');
    if (currentQueue.length === 0) {
      console.log('App: Cola vacía, nada que sincronizar');
      return;
    }

    console.log('App: Iniciando processSyncQueue - cola:', currentQueue.length, 'items');
    isSyncingRef.current = true;

    const storedUserStr = localStorage.getItem('softball_user');
    let userId = user?.sub || '';
    if (storedUserStr) {
      try {
        const parsed = JSON.parse(storedUserStr);
        userId = parsed.sub || userId;
      } catch (e) {
        console.error('App: Error parseando usuario de localStorage:', e);
      }
    }

    if (!userId) {
      console.warn('App: No hay userId disponible, esperando autenticación');
      isSyncingRef.current = false;
      return;
    }

    let successCount = 0;
    const remainingQueue = [];
    const reqHeaders = { 'Content-Type': 'application/json', 'x-user-id': userId };

    for (const action of currentQueue) {
      try {
        const actionHeaders = { ...reqHeaders, 'x-team-id': action.teamId || localStorage.getItem('softball_active_team') || '' };
        const fullUrl = action.url.startsWith('http') ? action.url : `${apiUrl}${action.url}`;

        console.log('App: Procesando acción:', action.method, fullUrl, 'headers:', actionHeaders, 'body:', action.body);

        const res = await fetchWithFallback(fullUrl, {
          method: action.method,
          headers: actionHeaders,
          body: action.body ? JSON.stringify(action.body) : undefined,
        });

        console.log('App: Respuesta de sync:', res.status, res.ok, res.statusText);

        if (res.ok) {
          successCount++;
          console.log('App: Acción sincronizada exitosamente');
        } else if (res.status >= 400 && res.status < 500) {
          console.error('App: Error permanente (4xx), descartando item:', action, 'Status:', res.status);
          // No lo añadimos a remainingQueue para que no bloquee para siempre
        } else {
          console.log('App: Acción fallida, reintentando:', res.status, res.statusText);
          remainingQueue.push(action);
        }
      } catch (e) {
        console.error('App: Excepción en sync:', e);
        remainingQueue.push(action);
      }
    }

    console.log('App: Sync completado - exitosos:', successCount, 'restantes:', remainingQueue.length);

    // Actualizar localStorage y estado
    localStorage.setItem('softball_sync_queue', JSON.stringify(remainingQueue));
    setOfflineSyncQueue(remainingQueue);

    if (successCount > 0) {
      console.log('App: Refrescando datos después de sync exitoso');
      // Refrescar datos en paralelo
      Promise.all([
        fetchPlayers(),
        fetchPayments(),
        fetchExpenses(),
        fetchGames()
      ]).catch(e => console.error('App: Error refrescando datos:', e));
    }

    isSyncingRef.current = false;
  };

  // Auto-Sync background task: Corregir ella sola sin detener la app
  useEffect(() => {
    console.log('App: useEffect auto-sync - isOnline:', isOnline, 'queue length:', offlineSyncQueue.length);
    let syncInterval: any;

    if (isOnline && offlineSyncQueue.length > 0) {
      console.log('App: Iniciando intervalo de sync automático');

      // Ejecutar sync inmediato si no está ya sincronizando
      if (!isSyncingRef.current) {
        console.log('App: Ejecutando sync inmediato por queue pendiente');
        processSyncQueue();
      }

      // Configurar intervalo para reintentos cada 30 segundos
      syncInterval = setInterval(() => {
        if (!isSyncingRef.current && offlineSyncQueue.length > 0) {
          console.log('App: Ejecutando sync automático programado');
          processSyncQueue();
        }
      }, 30000); // Re-intento automático cada 30 segundos si hay pendientes
    }

    return () => {
      if (syncInterval) {
        console.log('App: Limpiando intervalo de sync');
        clearInterval(syncInterval);
      }
    };
  }, [isOnline, offlineSyncQueue.length]); // Dependencias correctas

  // Efecto adicional para manejar cambios de online a offline y viceversa
  useEffect(() => {
    if (isOnline && offlineSyncQueue.length > 0 && !isSyncingRef.current) {
      console.log('App: Cambio a online detectado, intentando sync inmediato');
      setTimeout(() => processSyncQueue(), 1000);
    }
  }, [isOnline]); // Solo depende de isOnline

  const fetchData = async (url: string, cacheKey: string, setter: any, setLoading: any) => {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setter(JSON.parse(cached));
    } else if (!isOnline) {
      // No hay conexión y no hay caché: limpiar el estado para no mostrar datos de otro equipo
      setter([]);
    }

    if (!isOnline) {
      if (setLoading) setLoading(false);
      return;
    }

    try {
      if (!cached && setLoading) setLoading(true);
      const res = await fetchWithFallback(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setter(data);
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (err) {
      console.error('Fetch failed for ' + cacheKey, err);
    } finally {
      if (setLoading) setLoading(false);
    }
  };

  const fetchPlayers = () => fetchData(`${apiUrl}/api/players`, `softball_players_${activeTeamId}`, setPlayers, setLoadingPlayers);
  const fetchPayments = () => fetchData(`${apiUrl}/api/payments`, `softball_payments_${activeTeamId}`, setPayments, () => { });
  const fetchExpenses = () => fetchData(`${apiUrl}/api/expenses`, `softball_expenses_${activeTeamId}`, setExpenses, () => { });
  const fetchGames = () => fetchData(`${apiUrl}/api/games`, `softball_games_${activeTeamId}`, setGames, setLoadingGames);
  const fetchPaymentConcepts = () => fetchData(`${apiUrl}/api/payment-concepts`, `softball_concepts_${activeTeamId}`, setPaymentConcepts, setLoadingConcepts);

  const mutateData = async (url: string, method: string, payload: any, setList: any, cacheKey: string, successCallback: any): Promise<boolean> => {
    const handleOptimisticUpdate = (tempId: string) => {
      setList((prev: any[]) => {
        let optimisticList;
        if (method === 'DELETE') {
          optimisticList = prev.filter((item: any) => item.id !== payload);
        } else if (method === 'PUT') {
          optimisticList = prev.map((item: any) => item.id === payload.id ? { ...item, ...payload } : item);
        } else {
          const optimisticItem = { id: tempId, eventDate: payload.eventDate || new Date().toISOString(), ...payload };
          optimisticList = [optimisticItem, ...prev];
        }
        localStorage.setItem(cacheKey, JSON.stringify(optimisticList));
        return optimisticList;
      });
    };

    const actionUrl = method === 'DELETE' ? `${url}/${payload}` : method === 'PUT' ? `${url}/${payload.id}` : url;

    if (!isOnline) {
      const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 5);
      handleOptimisticUpdate(tempId);
      saveToQueueAndStorage({ url: actionUrl, method, body: method === 'DELETE' ? null : payload, teamId: activeTeamId });
      successCallback(true);
      return true;
    }

    try {
      console.log('App: mutateData - Intentando petición directa:', method, actionUrl);
      const res = await fetchWithFallback(actionUrl, {
        method,
        headers: getAuthHeaders(),
        body: method === 'DELETE' ? undefined : JSON.stringify(payload),
      });

      if (res.ok) {
        console.log('App: mutateData - Petición exitosa, procesando respuesta');
        if (method === 'DELETE') {
          setList((prev: any[]) => {
            const newList = prev.filter((item: any) => item.id !== payload);
            localStorage.setItem(cacheKey, JSON.stringify(newList));
            return newList;
          });
        } else if (method === 'PUT') {
          const updatedItem = await res.json();
          setList((prev: any[]) => prev.map((item: any) => item.id === updatedItem.id ? updatedItem : item));
          setTimeout(() => {
            const current = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            const updated = current.map((item: any) => item.id === updatedItem.id ? updatedItem : item);
            localStorage.setItem(cacheKey, JSON.stringify(updated));
          }, 0);
        } else {
          const newItem = await res.json();
          setList((prev: any[]) => [newItem, ...prev]);
          setTimeout(() => {
            const current = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            localStorage.setItem(cacheKey, JSON.stringify([newItem, ...current]));
          }, 0);
        }
        successCallback(true);
        return true;
      } else {
        console.warn('App: mutateData - Error de API, guardando en cola:', res.status);
        if (res.status >= 500) throw new Error('Server Error');
        const errorText = await res.text();
        console.error('API Error Response:', res.status, errorText);
        successCallback(false);
        return false;
      }
    } catch (err: any) {
      console.warn('App: mutateData - Error de red, guardando en cola:', err.message);
      setIsOnline(false); // Fallback to offline status
      const tempId = 'temp_' + Date.now() + Math.random().toString(36).substring(2, 5);
      handleOptimisticUpdate(tempId);
      saveToQueueAndStorage({ url: actionUrl, method, body: method === 'DELETE' ? null : payload, teamId: activeTeamId });
      successCallback(true);
      return true;
    }
  };

  const fetchTeams = async () => {
    const cachedTeams = localStorage.getItem('softball_teams');
    if (cachedTeams) {
      try {
        const parsedTeams = JSON.parse(cachedTeams);
        if (Array.isArray(parsedTeams) && parsedTeams.length > 0) {
          setTeams(parsedTeams);
          if (!activeTeamId) {
            setActiveTeamId(parsedTeams[0].id);
            localStorage.setItem('softball_active_team', parsedTeams[0].id);
          }
        }
      } catch (err) {
        console.error('App: fetchTeams - no se pudo parsear caché de equipos', err);
      }
    }

    if (!isOnline) {
      setLoadingTeams(false);
      return;
    }

    try {
      setLoadingTeams(true);
      const res = await fetchWithFallback(`${TEAM_API_URL}`, { headers: { 'x-user-id': user?.sub || '' } });
      if (res.ok) {
        let fetchedTeams = await res.json();
        if (fetchedTeams.length === 0) {
          const createRes = await fetchWithFallback(TEAM_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user?.sub || '' },
            body: JSON.stringify({ name: configRaw.teamName, primaryColor: configRaw.primaryColor })
          });
          if (createRes.ok) {
            const newTeam = await createRes.json();
            fetchedTeams = [newTeam];
          }
        }
        setTeams(fetchedTeams);
        localStorage.setItem('softball_teams', JSON.stringify(fetchedTeams));
        if (fetchedTeams.length > 0) {
          const stillExists = fetchedTeams.find((t: any) => t.id === activeTeamId);
          if (!stillExists) {
            setActiveTeamId(fetchedTeams[0].id);
            localStorage.setItem('softball_active_team', fetchedTeams[0].id);
          }
        }
      }
    } catch (err) {
      console.error('App: fetchTeams - error al obtener equipos desde API', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    if (user) fetchTeams();
    // Re-usamos los helpers globales definidos arriba

    if (activeTeamId && user) {
      fetchPlayers();
      fetchPayments();
      fetchExpenses();
      fetchGames();
      fetchPaymentConcepts();
    }
  }, [activeTeamId, user]);

  // POST Handlers
  const handlePlayerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.jerseyNumber) return;

    mutateData(API_URL, 'POST', formData, setPlayers, `softball_players_${activeTeamId}`, (success: boolean) => {
      if (success) setFormData({ name: '', jerseyNumber: '', position: 'Infield', battingHand: 'Right', photo: '' });
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentFormData.playerId || !paymentFormData.amount) return;

    const selectedPlayer = players.find(p => p.id === paymentFormData.playerId);
    if (!selectedPlayer) return;

    let finalNotes = paymentFormData.notes;
    // Si es Pago de Play y se seleccionó un juego, armamos la nota para vincularlos automáticamente
    if (['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo'].includes(paymentFormData.description) && paymentFormData.gameId) {
      const selectedGame = games.find(g => g.id === paymentFormData.gameId);
      if (selectedGame) {
        const gameDateStr = formatDate(selectedGame.eventDate);
        const gameNote = `Juego Vs ${selectedGame.opponent} (${gameDateStr})`;
        finalNotes = finalNotes ? `${gameNote} - ${finalNotes}` : gameNote;
      }
    } else if (paymentFormData.description === 'Abono' && paymentFormData.abonoDescription) {
      const abonoNote = `Abono de: ${paymentFormData.abonoDescription}`;
      finalNotes = finalNotes ? `${abonoNote} - ${finalNotes}` : abonoNote;
    }

    const payload = {
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      amount: Number(paymentFormData.amount),
      description: paymentFormData.description === 'Otro' ? paymentFormData.otherDescription : paymentFormData.description,
      notes: finalNotes || '',
      eventDate: normalizeDate(paymentFormData.eventDate || getTodayString()),
      conceptId: (paymentFormData as any).conceptId || null
    };


    mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, (success: boolean) => {
      if (success) {
        setPaymentFormData({
          playerId: '',
          amount: '',
          description: '',
          otherDescription: '',
          abonoDescription: '',
          notes: '',
          gameId: '',
          eventDate: paymentFormData.eventDate
        });
      }
    });
  };

  const handleDeletePaymentsByDate = async (date: string, password: string): Promise<void> => {
    if (!password || password !== config.adminPassword) {
      throw new Error('Contraseña incorrecta');
    }

    const normalizedDate = getYYYYMMDD(date);
    if (!normalizedDate) {
      throw new Error('Fecha inválida');
    }

    const paymentsToDelete = payments.filter(payment => getYYYYMMDD(payment.eventDate) === normalizedDate);
    if (paymentsToDelete.length === 0) {
      return;
    }

    for (const payment of paymentsToDelete) {
      const deleted = await mutateData(PAYMENT_API_URL, 'DELETE', payment.id, setPayments, `softball_payments_${activeTeamId}`, () => { });
      if (!deleted) {
        throw new Error('No se pudieron eliminar todos los pagos. Intenta de nuevo.');
      }
    }
  };

  const handleDeletePayment = async (paymentId: string, password: string): Promise<void> => {
    if (!password || password !== config.adminPassword) {
      throw new Error('Contraseña incorrecta');
    }

    const deleted = await mutateData(PAYMENT_API_URL, 'DELETE', paymentId, setPayments, `softball_payments_${activeTeamId}`, () => { });
    if (!deleted) {
      throw new Error('No se pudo eliminar el pago. Intenta de nuevo.');
    }
  };

  const handleConceptSubmit = (name: string, amount: number) => {
    if (!name || !amount) return;
    const payload = { name, totalAmount: amount };
    mutateData(CONCEPT_API_URL, 'POST', payload, setPaymentConcepts, `softball_concepts_${activeTeamId}`, () => { });
  };

  const deleteConcept = (id: string) => {
    mutateData(CONCEPT_API_URL, 'DELETE', id, setPaymentConcepts, `softball_concepts_${activeTeamId}`, () => { });
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.amount || !expenseFormData.description) return;

    const finalCategory = expenseFormData.category === 'Otro' ? (expenseFormData.otherCategory || 'Otro') : expenseFormData.category;

    const payload = {
      category: finalCategory,
      amount: Number(expenseFormData.amount),
      description: expenseFormData.description,
      receipt: expenseFormData.receipt || '',
      eventDate: normalizeDate(expenseFormData.eventDate || getTodayString())
    };

    const success = await mutateData(EXPENSE_API_URL, 'POST', payload, setExpenses, `softball_expenses_${activeTeamId}`, (success: boolean) => {
      if (success) setExpenseFormData({ ...expenseFormData, amount: '', description: '', receipt: '', otherCategory: '', eventDate: getTodayString() });
    });

    return success;
  };

  const handleDeleteExpensesByDate = async (date: string, password: string): Promise<void> => {
    if (!password || password !== config.adminPassword) {
      throw new Error('Contraseña incorrecta');
    }

    const normalizedDate = getYYYYMMDD(date);
    if (!normalizedDate) {
      throw new Error('Fecha inválida');
    }

    const expensesToDelete = expenses.filter(expense => getYYYYMMDD(expense.eventDate) === normalizedDate);
    if (expensesToDelete.length === 0) {
      return;
    }

    for (const expense of expensesToDelete) {
      const deleted = await mutateData(EXPENSE_API_URL, 'DELETE', expense.id, setExpenses, `softball_expenses_${activeTeamId}`, () => { });
      if (!deleted) {
        throw new Error('No se pudieron eliminar todos los gastos. Intenta de nuevo.');
      }
    }
  };

  const handleGameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameFormData.opponent || !gameFormData.eventDate) return;

    const setGamesSorted = (update: any) => setGames((prev: any[]) => {
      const next = typeof update === 'function' ? update(prev) : update;
      return [...next].sort((a, b) => new Date(a.eventDate || a.date || 0).getTime() - new Date(b.eventDate || b.date || 0).getTime());
    });

    const payload = {
      ...gameFormData,
      eventDate: normalizeDate(gameFormData.eventDate || getTodayString())
    };

    mutateData(GAME_API_URL, 'POST', payload, setGamesSorted, `softball_games_${activeTeamId}`, (success: boolean) => {
      if (success) setGameFormData({ opponent: '', eventDate: getTodayString(), time: '', location: '', result: 'Pendiente' });
    });
  };

  const openEditModal = (type: string, data: any) => {
    if ((type === 'payment' || type === 'expense') && isOlderThan24h(data.registrationDate)) {
      setSecurityChallenge({
        isOpen: true,
        onVerified: () => {
          setEditModal({ isOpen: true, type, data: { ...data, _authorizedEdit: true } });
        }
      });
      return;
    }
    setEditModal({ isOpen: true, type, data: { ...data } });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const url = editModal.type === 'player' ? API_URL :
      editModal.type === 'payment' ? PAYMENT_API_URL :
        editModal.type === 'expense' ? EXPENSE_API_URL : GAME_API_URL;

    const setList = (update: any) => {
      if (editModal.type === 'game') {
        setGames((prev: any[]) => {
          const next = typeof update === 'function' ? update(prev) : update;
          return [...next].sort((a, b) => new Date(a.eventDate || a.date || 0).getTime() - new Date(b.eventDate || b.date || 0).getTime());
        });
      } else {
        const primarySetter = editModal.type === 'player' ? setPlayers :
          editModal.type === 'payment' ? setPayments : setExpenses;
        primarySetter(update);
      }
    };
    const cacheKey = editModal.type === 'player' ? `softball_players_${activeTeamId}` : editModal.type === 'payment' ? `softball_payments_${activeTeamId}` : editModal.type === 'expense' ? `softball_expenses_${activeTeamId}` : `softball_games_${activeTeamId}`;

    const payload = { ...editModal.data };

    if (payload._authorizedEdit) {
      delete payload._authorizedEdit;
      const securityLog = `\n[SEGURIDAD: Edición autorizada el ${new Date().toLocaleString()}]`;
      if (editModal.type === 'payment') {
        payload.notes = payload.notes ? payload.notes + securityLog : securityLog;
      } else if (editModal.type === 'expense') {
        payload.description = payload.description ? payload.description + securityLog : securityLog;
      }
    }

    if (editModal.type === 'payment') payload.amount = Number(payload.amount);
    if (editModal.type === 'expense') payload.amount = Number(payload.amount);

    if (payload.eventDate) {
      payload.eventDate = normalizeDate(payload.eventDate);
    }

    mutateData(url, 'PUT', payload, setList, cacheKey, (success: boolean) => {
      if (success) setEditModal({ isOpen: false, type: '', data: null });
    });
  };

  const confirmDelete = (type: string, id: string) => {
    setDeleteModal({ isOpen: true, type, id });
  };

  const executeDelete = () => {
    const { type, id } = deleteModal;
    const url = type === 'player' ? API_URL : type === 'payment' ? PAYMENT_API_URL : type === 'expense' ? EXPENSE_API_URL : GAME_API_URL;

    const setList = (update: any) => {
      if (type === 'game') {
        setGames((prev: any[]) => {
          const next = typeof update === 'function' ? update(prev) : update;
          return [...next].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        });
      } else {
        const primarySetter = type === 'player' ? setPlayers :
          type === 'payment' ? setPayments : setExpenses;
        primarySetter(update);
      }
    };
    const cacheKey = type === 'player' ? `softball_players_${activeTeamId}` : type === 'payment' ? `softball_payments_${activeTeamId}` : type === 'expense' ? `softball_expenses_${activeTeamId}` : `softball_games_${activeTeamId}`;

    mutateData(url, 'DELETE', id, setList, cacheKey, (success: boolean) => {
      if (success) setDeleteModal({ isOpen: false, type: '', id: '' });
    });
  };

  const isDateInRange = (dateString: string) => {
    if (!startDate && !endDate && !filterYear && !singleDate && !reportSpecificDate) return true;
    if (!dateString) return false;

    const itemDateStr = getYYYYMMDD(dateString);
    if (!itemDateStr) return false;

    // Report specific date filter takes priority
    if (reportSpecificDate) {
      return itemDateStr === reportSpecificDate;
    }

    if (singleDate) {
      return itemDateStr === singleDate;
    }

    const itemYYYY = itemDateStr.split('-')[0];

    if (filterYear && itemYYYY !== filterYear) {
      return false;
    }

    if (startDate && itemDateStr < startDate) return false;
    if (endDate && itemDateStr > endDate) return false;

    return true;
  };

  // Filter Variables
  const filteredPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name)).filter(p =>
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    p.jerseyNumber.includes(playerSearch) ||
    p.position.toLowerCase().includes(playerSearch.toLowerCase())
  );
  const filteredPayments = payments.filter(p => {
    const isStandard = ['Pago de Play', 'Pago Triangular', 'Pago Cuadrangular', 'Pago Torneo', 'Uniforme', 'Mensualidad', 'Multa', 'Abono', 'Otro', 'Deuda Pendiente', 'Ausente'].includes(p.description);
    const conceptMatch = paymentSearchConcept === 'Todos' ||
      p.description === paymentSearchConcept ||
      (paymentSearchConcept === 'Otro' && !isStandard);

    const matchSearch = p.playerName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      (p.notes && p.notes.toLowerCase().includes(paymentSearch.toLowerCase()));

    return conceptMatch && matchSearch && isDateInRange(p.eventDate || p.date || '');
  });

  const filteredGames = games.filter(g => {
    const matchSearch = g.opponent.toLowerCase().includes(gameSearch.toLowerCase()) ||
      (g.location || '').toLowerCase().includes(gameSearch.toLowerCase());

    return matchSearch && isDateInRange(g.eventDate || g.date || '');
  }).sort((a, b) => new Date(b.eventDate || b.date || 0).getTime() - new Date(a.eventDate || a.date || 0).getTime());

  const handleQuickPayment = (player: Player, gameDateStr: string, gameOpponent: string, rawDate: string) => {
    setQuickPaymentModal({ isOpen: true, player, gameDateStr, rawDate, opponent: gameOpponent, amount: '' });
  };

  const submitQuickPayment = async () => {
    const { player, gameDateStr, opponent, amount } = quickPaymentModal;
    if (!player) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Monto inválido.");
      return;
    }

    try {
      const payload = {
        playerId: player.id,
        playerName: player.name,
        amount: numAmount,
        description: 'Pago de Play',
        notes: `Juego Vs ${opponent} (${gameDateStr})`,
        eventDate: normalizeDate(quickPaymentModal.rawDate)
      };
      mutateData(PAYMENT_API_URL, 'POST', payload, setPayments, `softball_payments_${activeTeamId}`, (success: boolean) => {
        if (success) setQuickPaymentModal({ isOpen: false, player: null, gameDateStr: '', rawDate: '', opponent: '', amount: '' });
      });
    } catch (err) {
      console.error('Failed to create quick payment:', err);
      alert("Error en la operación al guardar el pago rápido.");
    }
  };

  // Extract unique game dates for filtering
  const availableGameDates = Array.from(new Set(games.map(g => {
    const d = getYYYYMMDD(g.eventDate || g.date || '');
    return d ? JSON.stringify({ date: d, opponent: g.opponent }) : null;
  }).filter(Boolean)))
    .map(s => JSON.parse(s as string))
    .sort((a, b) => b.date.localeCompare(a.date));

  /* const totalExpenses = expenses.filter(e => isDateInRange(e.eventDate || e.date || '')).reduce((acc, curr) => acc + curr.amount, 0); */

  const reportConcepts = Array.from(new Set([
    ...payments.map(p => p.description),
    ...expenses.map(e => e.category)
  ])).filter(Boolean).sort();

  // Login View
  // Login View
  if (!user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        textAlign: 'center',
        background: `radial-gradient(circle at top left, ${config.primaryColor}22, transparent 40%), radial-gradient(circle at bottom right, #8b5cf622, transparent 40%), var(--bg-color)`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Adornos de fondo */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', background: config.primaryColor, filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '300px', height: '300px', background: '#8b5cf6', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%' }}></div>

        <div style={{ marginBottom: '3rem', animation: 'fadeInDown 0.8s ease-out' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '1.5rem',
            borderRadius: '24px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            marginBottom: '1.5rem'
          }}>
            <img src="/logo.png" alt="ZeratyX" style={{ height: '90px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-color)', margin: '0 0 0.5rem', letterSpacing: '-0.025em' }}>
            Softball Report
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: '500' }}>
            Panel de Gestión para {config.teamName}
          </p>
        </div>

        <div className="glass-panel" style={{
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '380px',
          borderRadius: '28px',
          border: '1px solid rgba(255,255,255,0.15)',
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: `${config.primaryColor}22`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            border: `1px solid ${config.primaryColor}44`
          }}>
            <ShieldCheck size={32} color={config.primaryColor} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f8fafc', marginBottom: '0.75rem' }}>
            Acceso Seguro
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2.5rem' }}>
            Bienvenido al sistema oficial. Por favor, autentícate para gestionar tu equipo.
          </p>

          <button
            onClick={handleNativeLogin}
            className="btn-google-premium"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              background: '#ffffff',
              color: '#1e293b',
              padding: '1rem 1.5rem',
              borderRadius: '14px',
              border: 'none',
              fontWeight: '700',
              fontSize: '1rem',
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" style={{ width: '22px', height: '22px' }} />
            {isWebBrowser ? 'Entrar como usuario genérico' : 'Entrar con Google'}
          </button>

          {googleAuthFailed && !isWebBrowser && (
            <>
              <button
                onClick={handleNativeLoginFallback}
                className="btn-secondary"
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '0.95rem 1.25rem',
                  borderRadius: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Entrar sin Google (temporal)
              </button>
              {googleAuthErrorMsg && (
                <p style={{ color: '#f87171', marginTop: '0.75rem', fontSize: '0.9rem', textAlign: 'center' }}>
                  Detalles: {googleAuthErrorMsg}
                </p>
              )}
            </>
          )}

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', width: '100%' }}>
            <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Desarrollado por ZeratyX v1.1.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderModals = () => {
    return (
      <>
        {isSettingsOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header">
                <h3 className="modal-title">
                  <Settings size={24} color={config.primaryColor} />{t('Configuración y Equipos', config.language)} </h3>
              </div>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <label className="form-label">{t('Seleccionar Equipo Activo', config.language)} </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select className="input-field" value={activeTeamId} onChange={(e) => {
                      setActiveTeamId(e.target.value);
                      localStorage.setItem('softball_active_team', e.target.value);
                    }}>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button className="btn-secondary" onClick={() => setNewTeamModalOpen(true)}>Nuevo</button>
                  </div>
                </div>

                {/* API Server configuration removed per user request for automation */}

                <div className="form-group">
                  <label className="form-label">{t('Editar Nombre del Equipo', config.language)} </label>
                  <input className="input-field" value={configRaw.teamName} onChange={(e) => setConfigRaw({ ...configRaw, teamName: e.target.value })} />
                </div>


                <div className="form-group">
                  <label className="form-label">{t('Color Principal', config.language)} </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <input type="color" className="input-field" value={configRaw.primaryColor} onChange={(e) => setConfigRaw({ ...configRaw, primaryColor: e.target.value })} style={{ height: '50px', padding: '0.2rem', cursor: 'pointer', maxWidth: '80px' }} />
                    <span style={{ color: configRaw.primaryColor, fontWeight: 'bold' }}>{configRaw.primaryColor}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <label className="form-label">{t('Idioma', config.language)}</label>
                  <select className="input-field" value={configRaw.language} onChange={(e) => setConfigRaw({ ...configRaw, language: e.target.value })}>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('Moneda', config.language)}</label>
                  <select className="input-field" value={configRaw.currency} onChange={(e) => setConfigRaw({ ...configRaw, currency: e.target.value })}>
                    <option value="USD">USD ($)</option>
                    <option value="MXN">MXN ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="DOP">DOP (RD$)</option>
                    <option value="VES">VES (Bs.)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <label className="form-label">PIN de Seguridad (Bloqueo por Inactividad)</label>
                  {!changingPinMode ? (
                    <button className="btn-secondary" onClick={() => {
                      setChangingPinMode(true); setPinStep(0); setPinError(''); setOldPinInput(''); setPinInput(''); setPinConfirmInput('');
                    }}>Modificar PIN Numérico</button>
                  ) : (
                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
                      {pinStep === 0 && (
                        <>
                          <label className="form-label" style={{ color: '#94a3b8' }}>Ingresa el PIN actual:</label>
                          <input type="password" pattern="[0-9]*" inputMode="numeric" maxLength={4} className="input-field" value={oldPinInput} onChange={e => setOldPinInput(e.target.value.replace(/[^0-9]/g, ''))} style={{ letterSpacing: '10px', textAlign: 'center', fontSize: '1.5rem' }} autoFocus />
                          <button className="btn-primary" onClick={() => {
                            if (oldPinInput === localStorage.getItem('softball_app_pin')) {
                              setPinStep(1); setPinError('');
                            } else {
                              setPinError('El PIN actual es incorrecto');
                            }
                          }} style={{ marginTop: '0.8rem' }}>Verificar</button>
                        </>
                      )}
                      {pinStep === 1 && (
                        <>
                          <label className="form-label" style={{ color: '#38bdf8' }}>Ingresa el NUEVO PIN (4 dígitos):</label>
                          <input type="password" pattern="[0-9]*" inputMode="numeric" maxLength={4} className="input-field" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, ''))} style={{ border: '1px solid #38bdf8', letterSpacing: '10px', textAlign: 'center', fontSize: '1.5rem' }} autoFocus />
                          <button className="btn-primary" onClick={() => {
                            if (pinInput.length === 4) {
                              setPinStep(2); setPinError('');
                            } else {
                              setPinError('Debe ingresar 4 dígitos');
                            }
                          }} style={{ marginTop: '0.8rem' }}>Siguiente</button>
                        </>
                      )}
                      {pinStep === 2 && (
                        <>
                          <label className="form-label" style={{ color: '#22c55e' }}>Confirma el NUEVO PIN:</label>
                          <input type="password" pattern="[0-9]*" inputMode="numeric" maxLength={4} className="input-field" value={pinConfirmInput} onChange={e => setPinConfirmInput(e.target.value.replace(/[^0-9]/g, ''))} style={{ border: '1px solid #22c55e', letterSpacing: '10px', textAlign: 'center', fontSize: '1.5rem' }} autoFocus />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                            <button className="btn-secondary" onClick={() => setPinStep(1)}>Atrás</button>
                            <button className="btn-primary" onClick={() => {
                              if (pinInput === pinConfirmInput) {
                                localStorage.setItem('softball_app_pin', pinInput);
                                setChangingPinMode(false); setPinError(''); alert('PIN actualizado con éxito');
                              } else {
                                setPinError('Los PINs no coinciden');
                              }
                            }}>Guardar PIN</button>
                          </div>
                        </>
                      )}
                      {pinError && <div style={{ color: '#ef4444', marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}>{pinError}</div>}
                      <button className="btn-icon" onClick={() => setChangingPinMode(false)} style={{ marginTop: '0.5rem', padding: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '100%', borderRadius: '8px' }}>Cancelar</button>
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#38bdf8" /> Seguridad de Administración
                  </label>
                  {!pwdForm.show ? (
                    <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setPwdForm({ ...pwdForm, show: true })}>
                      Gestionar Contraseña Admin
                    </button>
                  ) : (
                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', animation: 'fadeIn 0.2s ease' }}>
                      {isRecoveryMode ? (
                        <div style={{ background: 'rgba(34,197,94,0.1)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <p style={{ color: '#22c55e', fontSize: '0.8rem', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ShieldCheck size={14} /> Identidad Verificada con Google
                          </p>
                          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '4px 0 0 0' }}>Puedes establecer una nueva contraseña directamente.</p>
                        </div>
                      ) : (
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Contraseña Actual</label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type={pwdVisibility.old ? "text" : "password"}
                              className="input-field"
                              value={pwdForm.old}
                              onChange={e => setPwdForm({ ...pwdForm, old: e.target.value })}
                              placeholder="••••••"
                            />
                            <button type="button" onClick={() => setPwdVisibility({ ...pwdVisibility, old: !pwdVisibility.old })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                              {pwdVisibility.old ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Nueva Contraseña</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={pwdVisibility.new ? "text" : "password"}
                            className="input-field"
                            value={pwdForm.new}
                            onChange={e => setPwdForm({ ...pwdForm, new: e.target.value })}
                            placeholder="Nueva"
                          />
                          <button type="button" onClick={() => setPwdVisibility({ ...pwdVisibility, new: !pwdVisibility.new })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            {pwdVisibility.new ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Confirmar Nueva</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={pwdVisibility.confirm ? "text" : "password"}
                            className="input-field"
                            value={pwdForm.confirm}
                            onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                            placeholder="Confirmar"
                          />
                          <button type="button" onClick={() => setPwdVisibility({ ...pwdVisibility, confirm: !pwdVisibility.confirm })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            {pwdVisibility.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <button type="button" className="btn-primary" style={{ width: '100%', background: '#38bdf8', color: '#0f172a', marginTop: '0.5rem' }} onClick={handleAdminPasswordChange}>
                        Actualizar Contraseña
                      </button>

                      {!isRecoveryMode && (
                        <button type="button" className="btn-secondary" onClick={handleForgotAdminPassword} style={{ width: '100%', marginTop: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', textDecoration: 'underline' }}>
                          Olvidé mi contraseña
                        </button>
                      )}

                      <button type="button" className="btn-secondary" onClick={() => setPwdForm({ ...pwdForm, show: false })} style={{ width: '100%', marginTop: '0.5rem' }}>
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

              </div>
              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <button className="btn-danger" onClick={async () => {
                  if (confirm('¿Seguro que deseas intentar eliminar este equipo?')) {
                    const res = await fetch(`${TEAM_API_URL}/${activeTeamId}`, { method: 'DELETE', headers: getAuthHeaders() });
                    if (res.ok) { fetchTeams(); setIsSettingsOpen(false); }
                    else { const err = await res.json(); alert(err.error); }
                  }
                }}>{t('Eliminar', config.language)} </button>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => setIsSettingsOpen(false)}>{t('Cerrar', config.language)} </button>
                  <button className="btn-primary" onClick={() => saveConfig(configRaw)} style={{ background: config.primaryColor, width: 'auto' }}>{t('Actualizar', config.language)} </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {newTeamModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header">
                <h3 className="modal-title">
                  <PlusCircle size={24} color="#22c55e" /> Crear Nuevo Equipo
                </h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nombre del Equipo</label>
                  <input className="input-field" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} autoFocus placeholder="Ej. Los Tigres" />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => { setNewTeamModalOpen(false); setNewTeamName(''); }}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  if (newTeamName) {
                    const res = await fetch(TEAM_API_URL, {
                      method: 'POST',
                      headers: getAuthHeaders(),
                      body: JSON.stringify({ name: newTeamName, primaryColor: configRaw.primaryColor })
                    });
                    if (res.ok) { fetchTeams(); setNewTeamModalOpen(false); setNewTeamName(''); }
                  }
                }} style={{ background: '#22c55e', width: 'auto' }}>
                  Guardar Equipo
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingReceipt && (
          <div className="modal-overlay" onClick={() => setViewingReceipt(null)} style={{ background: 'rgba(0,0,0,0.95)', zIndex: 3000 }}>
            <button className="btn-icon" style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 3100, background: 'rgba(255,255,255,0.1)' }} onClick={() => setViewingReceipt(null)}>
              <X size={32} color="white" />
            </button>
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <img src={viewingReceipt} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '16px', boxShadow: '0 0 40px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()} />
            </div>
          </div>
        )}

        {deleteModal.isOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header border-b-0">
                <h3 className="modal-title" style={{ color: '#ef4444' }}>
                  <AlertCircle size={24} /> Confirmar Eliminación
                </h3>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar este registro? Esta acción es irreversible y afectará el balance e historial del equipo.</p>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setDeleteModal({ isOpen: false, type: '', id: '' })}>Cancelar</button>
                <button className="btn-danger" onClick={executeDelete}>
                  <Trash2 size={18} style={{ marginRight: '4px' }} /> Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmActionModal.isOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header border-b-0">
                <h3 className="modal-title" style={{ color: '#f8fafc' }}>
                  <AlertCircle size={24} color={config.primaryColor} /> {confirmActionModal.title}
                </h3>
              </div>
              <div className="modal-body">
                <p>{confirmActionModal.message}</p>
                {confirmActionModal.requiresInput && (
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label className="form-label">{confirmActionModal.inputLabel}</label>
                    <input type="number" step="0.01" className="input-field" value={confirmActionInput} onChange={e => setConfirmActionInput(e.target.value)} autoFocus />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => { setConfirmActionModal({ ...confirmActionModal, isOpen: false }); setConfirmActionInput(''); }}>Cancelar</button>
                <button className="btn-primary" style={{ background: config.primaryColor }} onClick={() => {
                  confirmActionModal.onConfirm(confirmActionModal.requiresInput ? confirmActionInput : undefined);
                  setConfirmActionModal({ ...confirmActionModal, isOpen: false });
                  setConfirmActionInput('');
                }}>Confirmar</button>
              </div>
            </div>
          </div>
        )}

        {isPlayerPaymentsModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header">
                <h3 className="modal-title">
                  <Users size={24} color="#f59e0b" /> Pagos Totales por Jugador
                </h3>
              </div>
              <div className="modal-body">
                <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                  Suma de pagos basada en los filtros activos actualmente.
                </p>
                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {Object.values(
                    filteredPayments.reduce((acc, p) => {
                      if (!acc[p.playerId]) acc[p.playerId] = { name: p.playerName, total: 0 };
                      acc[p.playerId].total += p.amount;
                      return acc;
                    }, {} as Record<string, { name: string, total: number }>)
                  ).sort((a: any, b: any) => b.total - a.total).map((p: any) => (
                    <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ color: '#f8fafc', fontWeight: 'bold' }}>{p.name}</span>
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                  {filteredPayments.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>No hay pagos registrados.</div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setIsPlayerPaymentsModalOpen(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {editModal.isOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header">
                <h3 className="modal-title">
                  <Edit2 size={24} color={config.primaryColor} /> Editar Registro
                </h3>
              </div>
              <div className="modal-body">
                <form id="editForm" onSubmit={handleEditSubmit}>
                  {editModal.type === 'player' && (
                    <>
                      <div className="form-group"><label className="form-label">Nombre</label><input className="input-field" value={editModal.data.name} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} required /></div>
                      <div className="form-group"><label className="form-label">{t('Número de Camiseta', config.language)} </label><input className="input-field" type="number" value={editModal.data.jerseyNumber} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, jerseyNumber: e.target.value } })} required /></div>

                      <div className="form-group"><label className="form-label">{t('Posición', config.language)} </label>
                        <select className="input-field" value={editModal.data.position} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, position: e.target.value } })}>{positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}</select>
                      </div>
                      <div className="form-group"><label className="form-label">{t('Foto (Opcional)', config.language)}</label><input type="file" accept="image/*" className="input-field" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = ev => setEditModal({ ...editModal, data: { ...editModal.data, photo: ev.target?.result as string } }); reader.readAsDataURL(file); } }} />{editModal.data.photo && <img src={editModal.data.photo} alt="Preview" style={{ marginTop: '0.5rem', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />}</div>
                    </>
                  )}
                  {editModal.type === 'payment' && (
                    <>
                      <div className="form-group"><label className="form-label">{t('Monto ($)', config.language)} </label><input className="input-field" type="number" step="0.01" value={editModal.data.amount} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, amount: e.target.value } })} required /></div>
                      <div className="form-group"><label className="form-label">{t('Concepto', config.language)} </label>
                        <input className="input-field" value={editModal.data.description} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })} required />
                      </div>
                      <div className="form-group"><label className="form-label">Fecha del Juego</label><input className="input-field" type="date" value={formatToInputDate(editModal.data.eventDate)} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, eventDate: e.target.value } })} required style={{ colorScheme: 'dark' }} /></div>
                      <div className="form-group"><label className="form-label">Descripción / Detalle</label><input className="input-field" value={editModal.data.notes || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, notes: e.target.value } })} /></div>
                    </>
                  )}
                  {editModal.type === 'expense' && (
                    <>
                      <div className="form-group"><label className="form-label">{t('Categoría', config.language)} </label>
                        <select className="input-field" value={editModal.data.category} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, category: e.target.value } })}>{expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                      </div>
                      <div className="form-group"><label className="form-label">{t('Monto ($)', config.language)} </label><input className="input-field" type="number" step="0.01" value={editModal.data.amount} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, amount: e.target.value } })} required /></div>
                      <div className="form-group"><label className="form-label">{t('Fecha del Gasto', config.language)} </label><input className="input-field" type="date" value={formatToInputDate(editModal.data.eventDate)} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, eventDate: e.target.value } })} required style={{ colorScheme: 'dark' }} /></div>
                      <div className="form-group"><label className="form-label">Descripción</label><input className="input-field" value={editModal.data.description} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, description: e.target.value } })} required /></div>
                    </>
                  )}
                  {editModal.type === 'game' && (
                    <>
                      <div className="form-group"><label className="form-label">{t('Oponente / Vs', config.language)} </label><input className="input-field" value={editModal.data.opponent} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, opponent: e.target.value } })} required /></div>
                      <div className="form-group"><label className="form-label">Fecha</label><input className="input-field" type="date" value={formatToInputDate(editModal.data.eventDate)} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, eventDate: e.target.value } })} required style={{ colorScheme: 'dark' }} /></div>
                      <div className="form-group"><label className="form-label">{t('Hora (Opcional)', config.language)} </label><input className="input-field" type="time" value={editModal.data.time || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, time: e.target.value } })} style={{ colorScheme: 'dark' }} /></div>
                      <div className="form-group"><label className="form-label">{t('Lugar / Estadio (Opcional)', config.language)} </label><input className="input-field" value={editModal.data.location || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, location: e.target.value } })} /></div>
                      <div className="form-group"><label className="form-label">{t('Resultado', config.language)} </label>
                        <select className="input-field" value={editModal.data.result} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, result: e.target.value } })}>
                          <option value="Pendiente">Pendiente</option><option value="Victoria">Victoria</option><option value="Derrota">Derrota</option><option value="Empate">Empate</option><option value="Suspendido">Suspendido</option>
                        </select>
                      </div>
                    </>
                  )}
                </form>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setEditModal({ isOpen: false, type: '', data: null })}>Cancelar</button>
                <button type="submit" form="editForm" className="btn-primary" style={{ background: config.primaryColor, width: 'auto' }}>Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}

        {quickPaymentModal.isOpen && quickPaymentModal.player && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header">
                <h3 className="modal-title">
                  <DollarSign size={24} color="#22c55e" /> Cobro Rápido
                </h3>
              </div>
              <div className="modal-body">
                <p style={{ marginBottom: '1rem', color: '#f8fafc' }}>
                  Registrando <b>Pago de Play</b> para <b>{quickPaymentModal.player.name}</b> <br />
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Juego: Vs {quickPaymentModal.opponent} ({quickPaymentModal.gameDateStr})</span>
                </p>
                <div className="form-group">
                  <label className="form-label">Monto ($):</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="input-field"
                    value={quickPaymentModal.amount}
                    onChange={(e) => setQuickPaymentModal({ ...quickPaymentModal, amount: e.target.value })}
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setQuickPaymentModal({ isOpen: false, player: null, gameDateStr: '', rawDate: '', opponent: '', amount: '' })}>Cancelar</button>
                <button className="btn-primary" onClick={submitQuickPayment} style={{ background: '#22c55e', width: 'auto' }}>Confirmar Pago</button>
              </div>
            </div>
          </div>
        )}

        {isDateFilterModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-handle" />
              <div className="modal-header">
                <h3 className="modal-title">
                  <Calendar size={24} color={config.primaryColor} /> Filtrar por Juegos
                </h3>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem 0' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.25rem', padding: '0 1.25rem' }}>Selecciona un juego de la lista para ver sus registros correspondientes:</p>
                <div className="selection-grid">
                  <div
                    className={`selection-card ${!singleDate ? 'active' : ''}`}
                    onClick={() => {
                      setSingleDate('');
                      setStartDate('');
                      setEndDate('');
                      setFilterYear('');
                      setIsDateFilterModalOpen(false);
                    }}
                  >
                    <div className="selection-card-icon"><Activity size={24} /></div>
                    <div className="selection-card-content">
                      <div className="selection-card-title">Ver Todos los Juegos</div>
                      <div className="selection-card-subtitle">{!singleDate ? 'Vista completa activa' : 'Quitar filtros de fecha'}</div>
                    </div>
                  </div>

                  {availableGameDates.map((g, idx) => {
                    const isActive = g.date === singleDate;
                    return (
                      <div
                        key={idx}
                        className={`selection-card ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setSingleDate(g.date);
                          setStartDate('');
                          setEndDate('');
                          setFilterYear('');
                          setIsDateFilterModalOpen(false);
                        }}
                      >
                        <div className="selection-card-icon" style={{ color: isActive ? '#22c55e' : '#3b82f6' }}><Calendar size={24} /></div>
                        <div className="selection-card-content">
                          <div className="selection-card-title">{formatDate(g.date)}</div>
                          <div className="selection-card-subtitle">Vs {g.opponent}</div>
                        </div>
                      </div>
                    );
                  })}

                  {availableGameDates.length === 0 && (
                    <div style={{ padding: '2rem', gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8' }}>
                      <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p>No hay juegos registrados aún.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setIsDateFilterModalOpen(false)} style={{ width: '100%' }}>{t('Cerrar', config.language)}</button>
              </div>
            </div>
          </div>
        )}



        {isReportFilterModalOpen && (
          <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h2 className="section-title"><Sliders size={24} color={config.primaryColor} /> {t('Filtrar reporte por', config.language)}</h2>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                  <div className="form-group" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: config.primaryColor }}>
                      <User size={18} /> {t('Por Jugador', config.language)}
                    </label>
                    <select className="input-field" value={tempReportPlayerFilter} onChange={e => setTempReportPlayerFilter(e.target.value)}>
                      <option value="">{t('Ver Todos los Jugadores', config.language)}</option>
                      {[...players].sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name} (#{p.jerseyNumber})</option>)}
                    </select>
                  </div>

                  <div className="form-group" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: config.primaryColor }}>
                      <Calendar size={18} /> {t('Por Periodo de Tiempo', config.language)}
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ padding: '0.5rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.1)', marginBottom: '0.5rem' }}>
                        <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={14} /> {t('Fecha específica', config.language)}
                        </label>
                        <input type="date" className="input-field" value={tempReportSpecificDate} onChange={e => setTempReportSpecificDate(e.target.value)} style={{ colorScheme: 'dark', border: '1px solid rgba(56, 189, 248, 0.3)' }} />
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>* {t('Si seleccionas una fecha, se ignorará el rango de abajo.', config.language)}</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: tempReportSpecificDate ? 0.5 : 1, pointerEvents: tempReportSpecificDate ? 'none' : 'auto' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t('Desde', config.language)}</label>
                          <input type="date" className="input-field" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{t('Hasta', config.language)}</label>
                          <input type="date" className="input-field" value={tempEndDate} onChange={e => setTempEndDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: config.primaryColor }}>
                      <TrendingUp size={18} /> {t('Tipo de Movimiento', config.language)}
                    </label>
                    <select className="input-field" value={tempReportType} onChange={e => setTempReportType(e.target.value)}>
                      <option value="Todos">{t('Ver Todo (Ingresos y Gastos)', config.language)}</option>
                      <option value="Ingresos">{t('Solo Ingresos', config.language)}</option>
                      <option value="Gastos">{t('Solo Gastos', config.language)}</option>
                    </select>
                  </div>

                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button className="btn-primary" onClick={handleApplyReportFilters} style={{ width: '100%', background: `linear-gradient(135deg, ${config.primaryColor} 0%, #2563eb 100%)` }}>
                  {t('Aplicar filtros', config.language)}
                </button>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-secondary" onClick={handleClearReportFilters} style={{ flex: 1 }}>{t('Limpiar filtros', config.language)}</button>
                  <button className="btn-secondary" onClick={() => {
                    setIsReportFilterModalOpen(false);
                    // Resetear temporales al cerrar sin aplicar (Task 5)
                    setTempReportPlayerFilter('');
                    setTempStartDate('');
                    setTempEndDate('');
                    setTempReportType('Todos');
                    setTempReportSpecificDate('');
                  }} style={{ flex: 1 }}>{t('Cerrar', config.language)}</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {securityChallenge.isOpen && (
          <div className="modal-overlay" style={{ zIndex: 4000 }}>
            <div className="modal-content" style={{ maxWidth: '380px', border: `1px solid ${config.primaryColor}30` }}>
              <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                  <div style={{ background: `${config.primaryColor}15`, padding: '1rem', borderRadius: '50%' }}>
                    <Lock size={32} color={config.primaryColor} />
                  </div>
                  <h3 className="modal-title" style={{ textAlign: 'center' }}>Acceso Administrativo</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Este pago tiene más de 24 horas. Introduce la contraseña para editar.</p>
                </div>
              </div>
              <div className="modal-body" style={{ paddingTop: '1.5rem' }}>
                <div className="form-group">
                  <div style={{ position: 'relative' }}>
                    <input
                      type={pwdVisibility.challenge ? "text" : "password"}
                      className="input-field"
                      value={securityPasswordInput}
                      onChange={e => { setSecurityPasswordInput(e.target.value); setErrorStatus(null); }}
                      placeholder="Contraseña"
                      autoFocus
                      style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: securityPasswordInput && !pwdVisibility.challenge ? '4px' : 'normal' }}
                    />
                    <button type="button" onClick={() => setPwdVisibility({ ...pwdVisibility, challenge: !pwdVisibility.challenge })} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                      {pwdVisibility.challenge ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errorStatus && <p style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', marginTop: '0.5rem', fontWeight: 'bold' }}>{errorStatus}</p>}
                </div>
                <button
                  className="btn-primary"
                  style={{ background: config.primaryColor, width: '100%', marginTop: '0.5rem' }}
                  onClick={() => {
                    // Bypassing verification
                    securityChallenge.onVerified();
                    setSecurityChallenge({ isOpen: false, onVerified: () => { } });
                    setSecurityPasswordInput('');
                  }}
                >
                  Confirmar Identidad
                </button>
              </div>
              <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center' }}>
                <button className="btn-secondary" style={{ border: 'none' }} onClick={() => { setSecurityChallenge({ isOpen: false, onVerified: () => { } }); setSecurityPasswordInput(''); }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Reusable Search Bar Component
  const renderSearchBar = (placeholder: string, value: string, setter: (val: string) => void, suggestions?: string[]) => {
    const listId = suggestions ? `list-${placeholder.replace(/\\s/g, '').substring(0, 10)}` : undefined;
    return (
      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem 1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
        <Search size={20} color="#94a3b8" style={{ marginRight: '0.5rem' }} />
        <input type="text" placeholder={placeholder} value={value} onChange={(e) => setter(e.target.value)} list={listId} style={{ background: 'transparent', border: 'none', color: '#f8fafc', width: '100%', outline: 'none', fontSize: '1rem' }} />
        {suggestions && (
          <datalist id={listId}>
            {suggestions.map((s, idx) => <option key={idx} value={s} />)}
          </datalist>
        )}
      </div>
    );
  };

  // Reusable Date Range Filter Component
  const renderDateFilter = () => {
    return (
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button className="btn-secondary" onClick={openDateFilterModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center', background: singleDate ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.05)', border: singleDate ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
          <Calendar size={20} color={singleDate ? '#38bdf8' : '#94a3b8'} />
          <span style={{ color: singleDate ? '#38bdf8' : '#e2e8f0', fontWeight: singleDate ? 'bold' : 'normal' }}>
            {singleDate ? `Juego: ${formatDate(singleDate)}` : 'Seleccionar un Juego'}
          </span>
        </button>
        {singleDate && (
          <button className="btn-icon" onClick={() => { setSingleDate(''); setStartDate(''); setEndDate(''); setFilterYear(''); }} title="Limpiar filtro" style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
            <Trash2 size={20} color="#ef4444" />
          </button>
        )}
      </div>
    );
  };

  // Helper to render Connectivity and Sync Status
  const renderSyncStatus = () => {
    const hasPending = offlineSyncQueue.length > 0;

    return (
      <div
        title={isOnline ? 'En Línea' : 'Offline'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 0.6rem',
          borderRadius: '16px',
          background: isOnline ? 'rgba(34, 197, 94, 0.1)' : serverUnavailable ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isOnline ? 'rgba(34, 197, 94, 0.2)' : serverUnavailable ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {isOnline ? <Wifi size={16} color="#4ade80" /> : serverUnavailable ? <WifiOff size={16} color="#f59e0b" /> : <WifiOff size={16} color="#f87171" />}
          <div style={{
            position: 'absolute', top: -2, right: -2, width: '5px', height: '5px', borderRadius: '50%',
            background: isOnline ? '#22c55e' : serverUnavailable ? '#f59e0b' : '#ef4444',
            boxShadow: `0 0 8px ${isOnline ? '#22c55e' : serverUnavailable ? '#f59e0b' : '#ef4444'}`
          }} />
        </div>

        <div style={{ fontSize: '0.7rem', fontWeight: '600', color: isOnline ? '#22c55e' : serverUnavailable ? '#f59e0b' : '#ef4444' }}>
          {isOnline ? 'Online' : serverUnavailable ? 'Servidor no disponible' : 'Sin conexión'}
        </div>

        {hasPending && (
          <button
            onClick={(e) => { e.stopPropagation(); if (isOnline || serverUnavailable) processSyncQueue(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: isOnline ? '#f59e0b' : serverUnavailable ? '#6b7280' : '#ef4444',
              color: 'white',
              border: 'none', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem',
              fontWeight: '800', cursor: (isOnline || serverUnavailable) ? 'pointer' : 'not-allowed',
              animation: isOnline ? 'pulse 2s infinite' : 'none'
            }}
          >
            <RefreshCw size={10} className={isOnline ? "spin-icon" : ""} />
            {offlineSyncQueue.length}
          </button>
        )}
      </div>
    );
  };

  const navItems = [
    { id: 'Inicio', title: t('Inicio', config.language), icon: Home },
    { id: 'Jugadores', title: t('Jugadores', config.language), icon: Users },
    { id: 'Juegos', title: t('Juegos', config.language), icon: Calendar },
    { id: 'Asistencia', title: t('Asistencia', config.language), icon: ClipboardCheck },
    { id: 'Pagos', title: t('Pagos', config.language), icon: DollarSign },
    { id: 'Gastos', title: t('Gastos', config.language), icon: CreditCard },
    { id: 'Morosidad', title: t('Pendientes de Cobro', config.language), icon: AlertCircle },
    { id: 'Reportes', title: t('Reportes', config.language), icon: BarChart2 }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'Jugadores':
        return (
          <PlayersTab
            config={config}
            players={players}
            filteredPlayers={filteredPlayers}
            loadingPlayers={loadingPlayers}
            playerSearch={playerSearch}
            setPlayerSearch={setPlayerSearch}
            formData={formData}
            setFormData={setFormData}
            handlePlayerSubmit={handlePlayerSubmit}
            openEditModal={openEditModal}
            confirmDelete={confirmDelete}
            renderSearchBar={renderSearchBar}
            positions={positions}
          />
        );
      case 'Juegos':
        return (
          <GamesTab
            config={config}
            gameFormData={gameFormData}
            setGameFormData={setGameFormData}
            handleGameSubmit={handleGameSubmit}
            filteredGames={filteredGames}
            loadingGames={loadingGames}
            gameSearch={gameSearch}
            setGameSearch={setGameSearch}
            renderSearchBar={renderSearchBar}
            renderDateFilter={renderDateFilter}
            formatDate={formatDate}
            openEditModal={openEditModal}
            confirmDelete={confirmDelete}
          />
        );
      case 'Gastos':
        return (
          <ExpensesTab
            config={config}
            expenseFormData={expenseFormData}
            setExpenseFormData={setExpenseFormData}
            handleExpenseSubmit={handleExpenseSubmit}
            expenseCategories={expenseCategories}
            expenses={expenses}
            formatCurrency={formatCurrency}
            openEditModal={openEditModal}
            onDeleteExpensesByDate={handleDeleteExpensesByDate}
          />
        );
      case 'Inicio':
        return (
          <DashboardTab
            config={config}
            players={players}
            payments={payments}
            expenses={expenses}
            setActiveTab={setActiveTab}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        );
      case 'Pagos':
        return (
          <PaymentsTab
            config={config}
            paymentFormData={paymentFormData}
            setPaymentFormData={setPaymentFormData}
            handlePaymentSubmit={handlePaymentSubmit}
            players={players}
            filteredPayments={filteredPayments}
            groupConcepts={paymentConcepts}
            loadingConcepts={loadingConcepts}
            handleConceptSubmit={handleConceptSubmit}
            deleteConcept={deleteConcept}
            formatCurrency={formatCurrency}
            openEditModal={openEditModal}
            onDeletePaymentsByDate={handleDeletePaymentsByDate}
            onDeletePayment={handleDeletePayment}
          />
        );
      case 'Asistencia':
        return (
          <AttendanceTab
            config={config}
            games={games}
            paymentControlGameId={paymentControlGameId}
            setPaymentControlGameId={setPaymentControlGameId}
            players={players}
            payments={payments}
            setPayments={setPayments}
            activeTeamId={activeTeamId}
            PAYMENT_API_URL={PAYMENT_API_URL}
            mutateData={mutateData}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            normalizeDate={normalizeDate}
            handleQuickPayment={handleQuickPayment}
            setConfirmActionModal={setConfirmActionModal}
            setConfirmActionInput={setConfirmActionInput}
            confirmDelete={confirmDelete}
          />
        );
      case 'Morosidad':
        return (
          <DebtsTab
            config={config}
            payments={payments}
            setPayments={setPayments}
            players={players}
            activeTeamId={activeTeamId}
            PAYMENT_API_URL={PAYMENT_API_URL}
            saveToQueueAndStorage={saveToQueueAndStorage}
            getAuthHeaders={getAuthHeaders}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />
        );
      case 'Reportes':
        return (
          <ReportsTab
            config={config}
            payments={payments}
            expenses={expenses}
            reportType={reportType}
            reportPlayerFilter={reportPlayerFilter}
            chartView={chartView}
            setChartView={setChartView}
            reportSearch={reportSearch}
            setReportSearch={setReportSearch}
            allConcepts={reportConcepts}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            isDateInRange={isDateInRange}
            renderSearchBar={renderSearchBar}
            setIsReportFilterModalOpen={openReportFilterModal}
            startDate={startDate}
            endDate={endDate}
            reportSpecificDate={reportSpecificDate}
            groupConcepts={paymentConcepts}
            setViewingReceipt={setViewingReceipt}
          />
        );
      default: return null;
    }
  };

  // Handles PIN Unlock / Setup and Forgotten PIN
  const handleForgotPin = async () => {
    if (confirm("Se cerrará tu sesión por seguridad. Deberás volver a autorizar tu cuenta con Google. Una vez iniciada sesión, podrás configurar un PIN nuevo. ¿Deseas continuar?")) {
      localStorage.removeItem('softball_app_pin');
      setIsLocked(false);
      setPinSetupMode(false);
      setPinInput('');
      await logout();
    }
  };

  if (user && (isLocked || pinSetupMode)) {
    const isSetup = pinSetupMode;
    const isConfirming = pinStep === 2;
    const primaryGradient = `linear-gradient(135deg, ${config.primaryColor}, #8b5cf6)`;

    return (
      <div className="premium-lock-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1.5rem',
        textAlign: 'center',
        background: `radial-gradient(circle at top left, ${config.primaryColor}22, transparent 40%), radial-gradient(circle at bottom right, #8b5cf622, transparent 40%), #0f172a`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated Background Orbs */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: config.primaryColor, filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%', animation: 'pulse 8s infinite alternate' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', background: '#8b5cf6', filter: 'blur(120px)', opacity: 0.1, borderRadius: '50%', animation: 'pulse 10s infinite alternate-reverse' }}></div>

        <div style={{ animation: 'fadeInDown 0.8s ease-out', marginBottom: '2rem', zIndex: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '1.25rem',
            borderRadius: '24px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            display: 'inline-block'
          }}>
            <img src="/logo.png" alt="ZeratyX" style={{ height: '70px', objectFit: 'contain' }} />
          </div>
        </div>

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem 2rem',
          borderRadius: '32px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          zIndex: 10,
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: `${config.primaryColor}22`,
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            border: `1px solid ${config.primaryColor}44`,
            boxShadow: `0 0 20px ${config.primaryColor}22`
          }}>
            <ShieldCheck size={32} color={config.primaryColor} />
          </div>

          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.75rem', letterSpacing: '-0.025em' }}>
            {isSetup ? (isConfirming ? 'Confirma tu Acceso' : 'Crea tu Seguridad') : 'Panel Protegido'}
          </h2>

          <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.5', marginBottom: '2rem' }}>
            {isSetup
              ? 'Establece un PIN de 4 dígitos para proteger la información de tu equipo.'
              : 'La aplicación se ha bloqueado por inactividad para proteger tus datos.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Input para PIN */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', display: 'block', marginBottom: '0.5rem' }}>
                PIN de Seguridad (4 dígitos)
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }} />
                <input
                  type={showPin ? "text" : "password"}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={isSetup ? (isConfirming ? pinConfirmInput : pinInput) : pinInput}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (isSetup) {
                      if (!isConfirming) setPinInput(val);
                      else setPinConfirmInput(val);
                    } else {
                      setPinInput(val);
                    }
                  }}
                  className="input-field"
                  style={{
                    paddingLeft: '3rem',
                    fontSize: '1.5rem',
                    letterSpacing: '10px',
                    textAlign: 'center',
                    border: pinError ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.2)'
                  }}
                  autoFocus
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', zIndex: 5 }}
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {pinError && (
              <div style={{
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: '600',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.75rem',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                animation: 'shake 0.4s ease'
              }}>
                {pinError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                className="btn-primary"
                style={{
                  padding: '1.1rem',
                  fontSize: '1rem',
                  fontWeight: '800',
                  background: primaryGradient,
                  boxShadow: `0 10px 20px ${config.primaryColor}33`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem'
                }}
                onClick={() => {
                  if (isSetup) {
                    if (!isConfirming) {
                      if (pinInput.length === 4) { setPinStep(2); setPinError(''); setPinConfirmInput(''); }
                      else { setPinError('Ingresa 4 dígitos numéricos.'); }
                    } else {
                      if (pinInput === pinConfirmInput) {
                        localStorage.setItem('softball_app_pin', pinInput);
                        setPinSetupMode(false);
                        setPinError('');
                        alert("Seguridad configurada con éxito.");
                      } else {
                        setPinError('Los códigos no coinciden. Intenta de nuevo.');
                        setPinConfirmInput('');
                      }
                    }
                  } else {
                    // Unlock logic (PIN or Password)
                    if (pinInput === localStorage.getItem('softball_app_pin')) {
                      setIsLocked(false);
                      setPinInput('');
                      setPinError('');
                    } else {
                      setPinError('PIN incorrecto. Vuelve a intentar.');
                      setPinInput('');
                    }
                  }
                }}
              >
                <ChevronRight size={20} />
                {isSetup ? (isConfirming ? 'Guardar Seguridad' : 'Continuar') : 'Desbloquear App'}
              </button>

              {!isSetup && (
                <button
                  className="btn-secondary"
                  style={{
                    padding: '1rem',
                    borderRadius: '16px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#e2e8f0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem'
                  }}
                >
                  <Fingerprint size={20} color="#94a3b8" />
                  Usar huella digital
                </button>
              )}

              {isSetup && isConfirming && (
                <button
                  className="btn-secondary"
                  onClick={() => setPinStep(1)}
                  style={{ border: 'none', background: 'transparent', color: '#94a3b8', textDecoration: 'underline' }}
                >
                  Regresar
                </button>
              )}
            </div>

            {!isSetup && (
              <button
                className="btn-secondary"
                style={{ marginTop: '1rem', color: '#64748b', border: 'none', background: 'transparent', fontSize: '0.85rem', textDecoration: 'underline' }}
                onClick={handleForgotPin}
              >
                ¿Olvidaste tu acceso de seguridad?
              </button>
            )}
          </div>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={14} color="#22c55e" />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Tu información está protegida</span>
          </div>
        </div>
      </div>
    );
  }

  console.log('App: Renderizando componente principal - user:', !!user, 'isLocked:', isLocked, 'pinSetupMode:', pinSetupMode, 'isOnline:', isOnline);
  return (
    <div>

      {/* New Sync Indicator integrated in Header */}
      <header className="main-header">
        <div className="header-left">
          <button className="btn-icon mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} style={{ padding: '8px' }}>
            <Menu size={24} color={theme === 'dark' ? '#f8fafc' : '#1e293b'} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
            <img src="/logo.png" alt="ZeratyX" style={{ height: '28px', objectFit: 'contain' }} />
          </div>
          {renderSyncStatus()}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Configuración">
            <Settings size={22} color={theme === 'dark' ? '#f8fafc' : '#1e293b'} />
          </button>
          <button className="btn-secondary" onClick={logout} style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--btn-secondary-bg)', color: 'var(--text-color)', border: '1px solid var(--panel-border)' }}>
            Salir
          </button>
        </div>
      </header>

      <main>{renderContent()}</main>

      {renderModals()}

      {/* MOBILE SIDEBAR OUTLAY */}
      <div className={`sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      <aside className={`mobile-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="ZeratyX" style={{ height: '32px' }} />
          <button className="btn-icon" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} color={theme === 'dark' ? '#f8fafc' : '#1e293b'} />
          </button>
        </div>
        <nav className="sidebar-nav-items">
          <div style={{ padding: '0.5rem 1rem 0.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Deportivo & Equipo</div>
          {navItems.filter(i => ['Inicio', 'Jugadores', 'Juegos', 'Alineación', 'Anotar'].includes(i.id)).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} className={`sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}>
                <Icon size={22} color={isActive ? config.primaryColor : '#94a3b8'} />
                <span style={{ color: isActive ? config.primaryColor : 'var(--text-color)', fontWeight: isActive ? 'bold' : 'normal', fontSize: '1.1rem' }}>{item.title}</span>
              </button>
            );
          })}

          <div style={{ padding: '1rem 1rem 0.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Finanzas & Admin</div>
          {navItems.filter(i => ['Asistencia', 'Pagos', 'Gastos', 'Morosidad', 'Reportes'].includes(i.id)).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} className={`sidebar-nav-item ${isActive ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}>
                <Icon size={22} color={isActive ? config.primaryColor : '#94a3b8'} />
                <span style={{ color: isActive ? config.primaryColor : 'var(--text-color)', fontWeight: isActive ? 'bold' : 'normal', fontSize: '1.1rem' }}>{item.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>



    </div>
  );
}

export default App;
