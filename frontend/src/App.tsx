import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  Search,
  Bell,
  Store,
  TrendingUp,
  Receipt,
  Clock,
  ArrowUpRight,
  Menu,
  X,
  Shirt,
  Wheat,
  ShoppingBasket,
  Plus,
  LogIn,
  LogOut,
} from 'lucide-react'
import Products from './pages/Products'


const API_URL = 'http://localhost:5000/api'

type StoreInfo = {
  id: string
  code: string
  name: string
  description: string
  icon: typeof Store
  sales: number
  transactions: number
  color: string
}

type ApiStore = {
  id: string
  code: string
  name: string
  type: 'FEEDS' | 'LAUNDRY_CAFE' | 'GROCERY'
  address: string | null
}

type UserInfo = {
  id: string
  name: string
  email: string
  role: string
  companyId: string
}

function mapStore(store: ApiStore): StoreInfo {
  const details = {
    FEEDS: {
      description: 'Animal feeds & supplies',
      icon: Wheat,
      color: 'amber',
    },
    LAUNDRY_CAFE: {
      description: 'Laundry services & café',
      icon: Shirt,
      color: 'blue',
    },
    GROCERY: {
      description: 'Everyday essentials',
      icon: ShoppingBasket,
      color: 'emerald',
    },
  }[store.type]

  return {
    id: store.id,
    code: store.code,
    name: store.name,
    ...details,
    sales: 0,
    transactions: 0,
  }
}

async function getStores(): Promise<StoreInfo[]> {
  const response = await fetch(`${API_URL}/stores`, {
    credentials: 'include',
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Unable to load stores.')
  }

  return (data.stores as ApiStore[]).map(mapStore)
}


const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Point of Sale', icon: ShoppingCart },
  { label: 'Products', icon: Package },
  { label: 'Inventory', icon: Warehouse },
  { label: 'Customers', icon: Users },
  { label: 'Customer Credit', icon: CreditCard },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
]

const money = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 2,
  }).format(amount)

function App() {

const [selectedStore, setSelectedStore] = useState('ALL')
const [activePage, setActivePage] = useState('Dashboard')
const [sidebarOpen, setSidebarOpen] = useState(false)
const [search, setSearch] = useState('')

const [user, setUser] = useState<UserInfo | null>(null)
const [stores, setStores] = useState<StoreInfo[]>([])
const [authLoading, setAuthLoading] = useState(true)
const [loginLoading, setLoginLoading] = useState(false)
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [authError, setAuthError] = useState('')

const canViewAllStores =
  user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN'

  const canManageProducts = [
  'OWNER',
  'COMPANY_ADMIN',
  'STORE_MANAGER',
  'INVENTORY_STAFF',
].includes(user?.role ?? '')

useEffect(() => {
  let cancelled = false

  async function restoreSession() {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      })

      if (!response.ok) return

      const data = await response.json()
      if (cancelled) return

      setUser(data.user)

      const availableStores = await getStores()
      if (!cancelled) {
        setStores(availableStores)
      }
    } catch (error) {
      if (!cancelled) {
        setAuthError(
          'Hindi makakonekta sa server. Tiyaking tumatakbo ang backend.',
        )
      }
    } finally {
      if (!cancelled) setAuthLoading(false)
    }
  }

  void restoreSession()

  return () => {
    cancelled = true
  }
}, [])

async function handleLogin(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  setLoginLoading(true)
  setAuthError('')

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.')
    }

    const availableStores = await getStores()

    setUser(data.user)
    setStores(availableStores)
    setSelectedStore('ALL')
    setActivePage('Dashboard')
    setPassword('')
  } catch (error) {
    setAuthError(
      error instanceof Error ? error.message : 'Unable to log in.',
    )
  } finally {
    setLoginLoading(false)
  }
}

async function handleLogout() {
  setAuthError('')

  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Logout failed. Please try again.')
    }

    setUser(null)
    setStores([])
    setSelectedStore('ALL')
    setActivePage('Dashboard')
    setPassword('')
  } catch (error) {
    setAuthError(
      error instanceof Error ? error.message : 'Unable to log out.',
    )
  }
}


  useEffect(() => {
    const loadStores = async () => {
      try {
        const storeData = await getStores()
        setStores(storeData)
      } catch (error) {
        console.error('Error loading stores:', error)
      }
    }

    loadStores()
  }, [])

  const visibleStores =
    selectedStore === 'ALL'
      ? stores
      : stores.filter((store) => store.id === selectedStore)

  const totalSales = visibleStores.reduce(
    (sum, store) => sum + store.sales,
    0,
  )

  const totalTransactions = visibleStores.reduce(
    (sum, store) => sum + store.transactions,
    0,
  )

  const currentStore = stores.find(
    (store) => store.id === selectedStore,
  )

  const pageTitle =
    activePage === 'Dashboard'
      ? 'Dashboard'
      : activePage


if (authLoading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Store className="mx-auto mb-3 text-indigo-600" size={36} />
        <p className="text-sm text-slate-600">
          Checking your session...
        </p>
      </div>
    </div>
  )
}

if (!user) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Store size={26} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              MultiStore
            </h1>
            <p className="text-sm text-slate-500">
              POS Management
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900">
          Welcome back
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage your stores.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Enter your password"
            />
          </div>

          {authError && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={18} />
            {loginLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure access to your centralized POS
        </p>
      </div>
    </div>
  )
}


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {sidebarOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Store size={22} />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-slate-900">
                MultiStore
              </h1>
              <p className="text-xs text-slate-500">POS Management</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-slate-100 p-4">
          <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => {
                  setActivePage(label)
                  setSidebarOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                  activePage === label
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={19} />
                <span>{label}</span>
                {label === 'Customer Credit' && (
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    AR
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">
              Centralized POS
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Manage all three businesses from one dashboard.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Demo interface
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {pageTitle}
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                Company-wide business overview
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 md:flex">
              <Search size={17} className="text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search..."
                className="w-28 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              aria-label="Notifications"
              className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
            >
              <Bell size={20} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
            </button>

            
          <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {user.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {user.name}
              </p>
              <p className="text-xs text-slate-500">{user.role}</p>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              title="Sign out"
              aria-label="Sign out"
              className="rounded-xl p-2.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={19} />
            </button>
          </div>

          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-8">
          <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">
                Welcome to your business workspace
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Business Overview
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Monitor your stores and daily operations.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="store-select"
                className="text-sm font-medium text-slate-600"
              >
                Store:
              </label>
              <select
                id="store-select"
                value={selectedStore}
                onChange={(event) =>
                  setSelectedStore(event.target.value)
                }
                className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="ALL">
                  {canViewAllStores ? 'All Stores' : 'All Accessible Stores'}
                </option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {activePage === 'Products' ? (
            <Products
              storeId={selectedStore === 'ALL' ? null : selectedStore}
              canManageProducts={canManageProducts}
            />
          ) : activePage === 'Dashboard' ? (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Total Sales Today"
                  value={money(totalSales)}
                  note="Across selected stores"
                  icon={TrendingUp}
                  color="indigo"
                />
                <MetricCard
                  label="Transactions"
                  value={String(totalTransactions)}
                  note="Recorded demo transactions"
                  icon={Receipt}
                  color="blue"
                />
                <MetricCard
                  label="Stores"
                  value={String(visibleStores.length)}
                  note="Included in this view"
                  icon={Store}
                  color="emerald"
                />
                <MetricCard
                  label="Customer Credit"
                  value="Not connected"
                  note="Available after backend setup"
                  icon={CreditCard}
                  color="amber"
                />
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Your Stores
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Select a store to view its demo summary.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                  {visibleStores.map((store) => {
                    const Icon = store.icon

                    return (
                      <div
                        key={store.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                              store.color === 'amber'
                                ? 'bg-amber-50 text-amber-700'
                                : store.color === 'blue'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            <Icon size={24} />
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {store.code}
                          </span>
                        </div>

                        <h4 className="mt-5 text-lg font-bold text-slate-900">
                          {store.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {store.description}
                        </p>

                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <p className="text-xs font-medium text-slate-500">
                            Today's sales
                          </p>
                          <div className="mt-1 flex items-end justify-between gap-2">
                            <p className="text-2xl font-bold tracking-tight text-slate-900">
                              {money(store.sales)}
                            </p>
                            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
                              <Receipt size={14} />
                              {store.transactions} transactions
                            </div>
                          </div>
                        </div>

                        <button
                         onClick={() => {
                            setSelectedStore(store.id)
                            setActivePage('Point of Sale')
                          }}
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                        >
                          Open Store POS
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        Sales Summary
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Demo sales comparison by store
                      </p>
                    </div>
                    <BarChart3 className="text-slate-400" size={21} />
                  </div>

                  <div className="mt-6 space-y-5">
                    {visibleStores.map((store) => {
                      const percentage =
                        totalSales > 0
                          ? (store.sales / totalSales) * 100
                          : 0

                      return (
                        <div key={store.id}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">
                              {store.name}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {money(store.sales)}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                store.color === 'amber'
                                  ? 'bg-amber-500'
                                  : store.color === 'blue'
                                    ? 'bg-blue-500'
                                    : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <p className="mt-6 text-xs text-slate-400">
                    Sample figures only. Actual reports will come from the
                    database.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">
                    Quick Actions
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Common business operations
                  </p>

                  <div className="mt-5 space-y-3">
                    {[
                      {
                        label: 'Open Point of Sale',
                        icon: ShoppingCart,
                        page: 'Point of Sale',
                      },
                      {
                        label: 'Add Product',
                        icon: Plus,
                        page: 'Products',
                      },
                      {
                        label: 'View Inventory',
                        icon: Warehouse,
                        page: 'Inventory',
                      },
                      {
                        label: 'Customer Credit',
                        icon: CreditCard,
                        page: 'Customer Credit',
                      },
                    ].map(({ label, icon: Icon, page }) => (
                      <button
                        key={label}
                        onClick={() => setActivePage(page)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left transition hover:border-indigo-100 hover:bg-indigo-50"
                      >
                        <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                          <Icon size={18} />
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-700">
                          {label}
                        </span>
                        <ArrowUpRight
                          size={16}
                          className="text-slate-400"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10">
              <div className="mx-auto max-w-lg py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  {activePage === 'Point of Sale' ? (
                    <ShoppingCart size={30} />
                  ) : activePage === 'Inventory' ? (
                    <Warehouse size={30} />
                  ) : activePage === 'Customer Credit' ? (
                    <CreditCard size={30} />
                  ) : activePage === 'Reports' ? (
                    <BarChart3 size={30} />
                  ) : (
                    <Package size={30} />
                  )}
                </div>
                <h3 className="mt-5 text-xl font-bold text-slate-900">
                  {activePage}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  This module is ready for implementation. It will be
                  connected to the backend and database in the next
                  development phases.
                </p>
                {currentStore && (
                  <p className="mt-3 text-sm font-medium text-indigo-700">
                    Selected store: {currentStore.name}
                  </p>
                )}
                <button
                  onClick={() => setActivePage('Dashboard')}
                  className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Back to Dashboard
                </button>
              </div>
            </section>
          )}

          <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-400">
            MultiStore POS · Development Preview · Sample data only
          </footer>
        </main>
      </div>
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: string
  note: string
  icon: typeof Store
  color: 'indigo' | 'blue' | 'emerald' | 'amber'
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  color,
}: MetricCardProps) {
  const iconColor = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }[color]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${iconColor}`}>
          <Icon size={22} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock size={14} />
        {note}
      </div>
    </div>
  )
}

export default App
