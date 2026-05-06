import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronRight, ShoppingBag, Search, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useClerk, SignIn } from '@clerk/clerk-react';

const API_BASE = '/api';
const STATUS_STEPS = ['신청완료', '구매완료', '배송중', '수령완료'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function StatusTracker({ currentStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(currentStatus);
  return (
    <div className="flex items-center mt-6">
      {STATUS_STEPS.map((step, i) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center gap-2">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                background: i <= currentIdx ? '#0066cc' : '#e0e0e0',
                color: i <= currentIdx ? '#fff' : '#86868b',
                flexShrink: 0,
              }}
            >
              {i < currentIdx ? '✓' : i + 1}
            </div>
            <span
              style={{
                fontSize: 12,
                whiteSpace: 'nowrap',
                color: i === currentIdx ? '#0066cc' : i < currentIdx ? '#1d1d1f' : '#86868b',
                fontWeight: i === currentIdx ? 600 : 400,
              }}
            >
              {step}
            </span>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                marginBottom: 22,
                background: i < currentIdx ? '#0066cc' : '#e0e0e0',
                minWidth: 16,
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function App() {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { signOut, openSignIn } = useClerk();

  const isAdmin = clerkUser?.publicMetadata?.role === 'admin';

  const [view, setView]                 = useState('landing');
  const [showLogin, setShowLogin]       = useState(false);
  const [pendingView, setPendingView]   = useState(null);
  const [events, setEvents]             = useState([]);
  const [requests, setRequests]         = useState([]);
  const [formData, setFormData]         = useState({ event_id: '', name: '', circle_name: '', address: '', item_name: '', quantity: 1 });
  const [eventForm, setEventForm]       = useState({ name: '', date: '', end_date: '' });
  const [eventFormMsg, setEventFormMsg] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);

  useEffect(() => { fetchEvents(); }, []);

  useEffect(() => {
    if (isSignedIn) {
      fetchRequests();
      if (pendingView) {
        setView(isAdmin ? 'admin' : pendingView);
        setPendingView(null);
        setShowLogin(false);
      }
    }
  }, [isSignedIn, view]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API_BASE}/events`);
      setEvents(res.data);
      if (res.data.length > 0) setFormData(prev => ({ ...prev, event_id: res.data[0].id }));
    } catch (err) { console.error(err); }
  };

  const fetchRequests = async () => {
    if (!clerkUser) return;
    try {
      const url = isAdmin
        ? `${API_BASE}/requests`
        : `${API_BASE}/requests?buyer_id=${clerkUser.id}`;
      const res = await axios.get(url);
      setRequests(res.data);
    } catch (err) { console.error(err); }
  };

  const handleShopClick = (eventId) => {
    setFormData(prev => ({ ...prev, event_id: eventId }));
    if (isSignedIn) {
      setView('buyer');
    } else {
      setPendingView('buyer');
      setShowLogin(true);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const selectedEvent = events.find(ev => ev.id === parseInt(formData.event_id));
      await axios.post(`${API_BASE}/requests?buyer_id=${clerkUser.id}`, {
        ...formData,
        event_name: selectedEvent?.name || '',
      });
      setFormData({ ...formData, name: '', circle_name: '', address: '', item_name: '', quantity: 1 });
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  const handleAddEvent = async () => {
    if (!eventForm.name.trim()) { setEventFormMsg('이벤트 이름을 입력하세요.'); return; }
    if (!eventForm.date) { setEventFormMsg('시작일을 선택하세요.'); return; }
    setEventFormMsg('저장 중...');
    try {
      await axios.post(`${API_BASE}/events`, eventForm);
      setEventForm({ name: '', date: '', end_date: '' });
      setEventFormMsg('추가됐어요!');
      fetchEvents();
      setTimeout(() => setEventFormMsg(''), 2000);
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setEventFormMsg(`오류: ${detail}`);
    }
  };

  const handleEditEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`${API_BASE}/events/${editingEvent.id}`, editingEvent);
      setEditingEvent(null);
      fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('이벤트를 삭제하면 관련 신청 내역은 유지됩니다. 삭제할까요?')) return;
    try {
      await axios.delete(`${API_BASE}/events/${id}`);
      fetchEvents();
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (requestId, newStatus) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    try {
      await axios.patch(`${API_BASE}/requests/${requestId}/status`, { status: newStatus });
    } catch (err) {
      console.error(err);
      fetchRequests();
    }
  };

  const requireAuth = (targetView) => {
    if (isSignedIn) {
      setView(targetView);
    } else {
      setPendingView(targetView);
      setShowLogin(true);
    }
  };

  return (
    <div className="min-h-screen pt-[44px]">

      {/* ── Global Nav ── */}
      <header className="global-nav">
        <div className="container-apple flex justify-between items-center w-full">
          <div className="flex gap-8 items-center">
            <span
              className="font-semibold cursor-pointer"
              style={{ fontSize: 14 }}
              onClick={() => setView('landing')}
            >
              OtaFetch
            </span>
            <span
              className="opacity-50 cursor-pointer hidden md:block hover:opacity-80 transition-opacity"
              style={{ fontSize: 12 }}
              onClick={() => setView('shop')}
            >
              Shop
            </span>
            <span
              className="opacity-50 cursor-pointer hidden md:block hover:opacity-80 transition-opacity"
              style={{ fontSize: 12 }}
              onClick={() => setView('status')}
            >
              Status
            </span>
            {isAdmin && (
              <span
                className="cursor-pointer hidden md:block hover:opacity-80 transition-opacity"
                style={{ fontSize: 12, color: '#0066cc', fontWeight: 600 }}
                onClick={() => setView('admin')}
              >
                Admin
              </span>
            )}
          </div>
          <div className="flex gap-5 items-center">
            <Search size={15} className="opacity-50 cursor-pointer hover:opacity-80 transition-opacity" />
            <ShoppingBag size={15} className="opacity-50 cursor-pointer hover:opacity-80 transition-opacity" />
          </div>
        </div>
      </header>

      {/* ── Sub Nav ── */}
      <nav className="sub-nav">
        <div className="container-apple flex justify-between items-center w-full">
          <span
            className="font-semibold tracking-tight cursor-pointer"
            style={{ fontSize: 21, color: '#1d1d1f' }}
            onClick={() => setView('landing')}
          >
            OtaFetch
          </span>
          <div className="flex gap-4 items-center">
            {isSignedIn ? (
              <>
                <span className="hidden sm:block font-medium uppercase tracking-wider" style={{ fontSize: 12, color: '#86868b' }}>
                  {clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress?.split('@')[0]}
                </span>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { signOut(); setView('landing'); }}
                  className="btn-apple btn-dark"
                  style={{ fontSize: 13, padding: '7px 16px' }}
                >
                  Sign Out
                </motion.button>
              </>
            ) : (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLogin(true)}
                className="btn-apple btn-primary"
                style={{ fontSize: '14px', padding: '8px 18px' }}
              >
                Sign In
              </motion.button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Views ── */}
      <AnimatePresence mode="wait">

        {/* ── Landing ── */}
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
            <section className="tile tile-white tile-hero">
              <div className="container-apple">
                <motion.p
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.6 }}
                  style={{ fontSize: 'clamp(13px,3vw,19px)', fontWeight: 600, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}
                >
                  대리구매•수령 플랫폼
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7 }}
                  className="hero-title max-w-4xl mx-auto"
                  style={{ marginBottom: 24 }}
                >
                  OtaFetch.<br />Your personal shopper.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }}
                  style={{ fontSize: 'clamp(16px,2.5vw,22px)', color: '#86868b', marginBottom: 40, textAlign: 'center', lineHeight: 1.5 }}
                >
                  코믹월드, 일러스타 페스등 서브컬쳐 행사들을 가장완벽하게 방구석에서 즐기는 방법.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex gap-4 justify-center items-center flex-wrap"
                >
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowLogin(true)}
                    className="btn-apple btn-primary"
                    style={{ fontSize: 16, padding: '11px 22px' }}
                  >
                    시작하기
                  </motion.button>
                  <button className="btn-link" style={{ fontSize: 16 }} onClick={() => setView('shop')}>
                    이벤트 보기 <ChevronRight size={16} />
                  </button>
                </motion.div>
              </div>
            </section>

            <section className="tile tile-dark">
              <div className="container-apple">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
                  className="section-title"
                  style={{ marginBottom: 32 }}
                >
                  현장에서 문 앞까지.<br />빈틈없는 대리구매.
                </motion.h2>
                <p style={{ fontSize: 'clamp(16px,2.5vw,22px)', color: 'rgba(255,255,255,0.5)', marginBottom: 48, textAlign: 'center', lineHeight: 1.5 }}>
                  전문 쇼퍼가 당신의 열정을 안전하게 배달합니다.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-px max-w-3xl mx-auto w-full">
                  {[
                    { label: '신청', desc: '원하는 굿즈를 간편하게 신청' },
                    { label: '구매', desc: '현장에서 쇼퍼가 직접 구매' },
                    { label: '배달', desc: '안전하게 포장해서 문 앞 배달' },
                  ].map((f, i) => (
                    <motion.div
                      key={f.label}
                      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.5 }}
                      className="rounded-2xl sm:rounded-none sm:first:rounded-l-2xl sm:last:rounded-r-2xl"
                      style={{ background: 'rgba(255,255,255,0.05)', padding: 'clamp(20px,4vw,40px)' }}
                    >
                      <p style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 600, marginBottom: 10, opacity: 0.4 }}>0{i + 1}</p>
                      <p style={{ fontSize: 'clamp(17px,2.5vw,21px)', fontWeight: 600, marginBottom: 6 }}>{f.label}</p>
                      <p style={{ fontSize: 'clamp(14px,2vw,17px)', opacity: 0.5 }}>{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          </motion.div>
        )}

        {/* ── Shop ── */}
        {view === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="page-section">
            <div className="container-apple">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Events
              </p>
              <h2 className="section-title" style={{ marginBottom: 12 }}>다가오는 이벤트</h2>
              <p style={{ fontSize: 19, color: '#86868b', marginBottom: 56 }}>
                참가할 이벤트를 선택하고 굿즈를 신청하세요.
              </p>

              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#86868b', fontSize: 17 }}>
                  등록된 이벤트가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event, i) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.5 }}
                      className="utility-card"
                      style={{ display: 'flex', flexDirection: 'column', gap: 0 }}
                    >
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                        이벤트
                      </p>
                      <h3 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, marginBottom: 12, letterSpacing: '-0.02em' }}>
                        {event.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#86868b', fontSize: 15, marginBottom: 'auto' }}>
                        <Calendar size={13} />
                        <span>{formatDate(event.date)}{event.end_date ? ` ~ ${formatDate(event.end_date)}` : ''}</span>
                      </div>
                      <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          className="btn-apple btn-primary"
                          style={{ fontSize: 15, padding: '10px 20px' }}
                          onClick={() => handleShopClick(event.id)}
                        >
                          신청하기
                        </motion.button>
                        <button className="btn-link" style={{ fontSize: 14 }}>
                          자세히 <ChevronRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Status ── */}
        {view === 'status' && (
          <motion.div key="status" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="page-section">
            <div className="container-apple">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Order Tracking
              </p>
              <h2 className="section-title" style={{ marginBottom: 12 }}>신청 조회</h2>

              {!isSignedIn ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <p style={{ fontSize: 19, color: '#86868b', marginBottom: 32 }}>
                    로그인하면 신청 현황을 확인할 수 있습니다.
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    className="btn-apple btn-primary"
                    style={{ fontSize: 17, padding: '12px 32px' }}
                    onClick={() => setShowLogin(true)}
                  >
                    로그인하기
                  </motion.button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 19, color: '#86868b', marginBottom: 48 }}>
                    {requests.length > 0 ? `${requests.length}건의 신청 내역이 있습니다.` : '신청 내역이 없습니다.'}
                  </p>
                  <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {requests.map((req, i) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="utility-card"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {req.event?.name}
                          </p>
                          <span style={{ fontSize: 12, color: '#86868b' }}>#{req.id}</span>
                        </div>
                        <h4 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.02em' }}>
                          {req.circle_name}
                        </h4>
                        <p style={{ fontSize: 15, color: '#86868b' }}>
                          {req.item_name} &nbsp;·&nbsp; {req.quantity}개
                        </p>
                        <StatusTracker currentStatus={req.status} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Buyer ── */}
        {view === 'buyer' && (
          <motion.div key="buyer" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="page-section">
            <div className="container-apple">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                <div className="md:col-span-4">
                  <h2 className="section-title" style={{ marginBottom: 8 }}>굿즈 신청</h2>
                  <p style={{ fontSize: 17, color: '#86868b', marginBottom: 32 }}>원하는 아이템을 등록하세요.</p>
                  <div className="utility-card">
                    <form onSubmit={handleSubmitRequest}>
                      <div className="apple-input-group">
                        <label className="apple-label">Event</label>
                        <select className="apple-input" value={formData.event_id} onChange={e => setFormData({ ...formData, event_id: e.target.value })}>
                          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                        </select>
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">이름</label>
                        <input type="text" className="apple-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="신청자 이름" required />
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">Circle / Booth</label>
                        <input type="text" className="apple-input" value={formData.circle_name} onChange={e => setFormData({ ...formData, circle_name: e.target.value })} placeholder="부스 명" required />
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">배송 주소</label>
                        <input type="text" className="apple-input" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="받으실 주소" required />
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">Item</label>
                        <input type="text" className="apple-input" value={formData.item_name} onChange={e => setFormData({ ...formData, item_name: e.target.value })} placeholder="아이템 명" required />
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">Quantity</label>
                        <input type="number" className="apple-input" min="1" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} required />
                      </div>
                      <motion.button whileTap={{ scale: 0.98 }} type="submit" className="btn-apple btn-primary w-full" style={{ height: 48, fontSize: 17, marginTop: 8 }}>
                        신청하기
                      </motion.button>
                    </form>
                  </div>
                </div>

                <div className="md:col-span-8">
                  <h2 className="section-title" style={{ marginBottom: 8 }}>신청 현황</h2>
                  <p style={{ fontSize: 17, color: '#86868b', marginBottom: 32 }}>
                    {requests.length > 0 ? `${requests.length}건 접수됨` : '아직 신청 내역이 없습니다.'}
                  </p>
                  <div className="flex flex-col gap-4">
                    {requests.map((req, i) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.4 }}
                        className="utility-card"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                              {req.event?.name}
                            </p>
                            <h4 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, letterSpacing: '-0.02em' }}>
                              {req.circle_name}
                            </h4>
                            <p style={{ fontSize: 15, color: '#86868b' }}>
                              {req.item_name} &nbsp;·&nbsp; {req.quantity}개
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span
                              style={{
                                width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                                background: req.status !== '수령완료' ? '#0066cc' : '#e0e0e0',
                                boxShadow: req.status !== '수령완료' ? '0 0 0 3px rgba(0,102,204,0.2)' : 'none',
                              }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap' }}>
                              {req.status}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {requests.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '80px 0', color: '#86868b', fontSize: 17 }}>
                        신청 내역이 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Admin ── */}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="page-section">
            <div className="container-apple">
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Admin
              </p>
              <h2 className="section-title" style={{ marginBottom: 12 }}>Operations Hub</h2>
              <p style={{ fontSize: 19, color: '#86868b', marginBottom: 48 }}>전체 신청 현황을 관리하세요.</p>

              <div className="utility-card table-scroll" style={{ padding: 0 }}>
                <table className="apple-table">
                  <thead>
                    <tr>
                      <th>Event • User</th>
                      <th>Details</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req, i) => (
                      <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                        <td>
                          <p style={{ fontWeight: 600, fontSize: 17 }}>{req.event?.name} • {req.name}</p>
                        </td>
                        <td>
                          <p style={{ fontWeight: 600, fontSize: 17, marginBottom: 2 }}>{req.circle_name}</p>
                          <p style={{ fontSize: 13, color: '#86868b' }}>{req.item_name} · {req.quantity}개</p>
                        </td>
                        <td>
                          <span className={`status-badge ${req.status !== '수령완료' ? 'status-badge-active' : ''}`}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: req.status !== '수령완료' ? '#0066cc' : '#d2d2d7' }} />
                            {req.status}
                          </span>
                        </td>
                        <td>
                          <select
                            className="apple-input"
                            style={{ height: 38, fontSize: 14, width: 'auto', minWidth: 120 }}
                            value={req.status}
                            onChange={e => updateStatus(req.id, e.target.value)}
                          >
                            <option value="신청완료">신청완료</option>
                            <option value="구매완료">구매완료</option>
                            <option value="배송중">배송중</option>
                            <option value="수령완료">수령완료</option>
                          </select>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {requests.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '80px 0', color: '#86868b', fontSize: 17 }}>
                    신청 내역이 없습니다.
                  </div>
                )}
              </div>

              {/* ── 이벤트 관리 ── */}
              <div style={{ marginTop: 64 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0066cc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                  Events
                </p>
                <h3 style={{ fontSize: 28, fontWeight: 600, marginBottom: 32, letterSpacing: '-0.02em' }}>이벤트 관리</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 이벤트 목록 */}
                  <div className="utility-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {events.map((ev, i) => (
                      <div key={ev.id} style={{ padding: '16px 20px', borderBottom: i < events.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        {editingEvent?.id === ev.id ? (
                          <form onSubmit={handleEditEvent} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                            <input className="apple-input" style={{ flex: '1 1 160px', height: 36, fontSize: 14 }} value={editingEvent.name} onChange={e => setEditingEvent({ ...editingEvent, name: e.target.value })} placeholder="이벤트 이름" required />
                            <input className="apple-input" type="date" style={{ width: 140, height: 36, fontSize: 14 }} value={editingEvent.date} onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })} required />
                            <input className="apple-input" type="date" style={{ width: 140, height: 36, fontSize: 14 }} value={editingEvent.end_date || ''} onChange={e => setEditingEvent({ ...editingEvent, end_date: e.target.value })} />
                            <button type="submit" className="btn-apple btn-primary" style={{ height: 36, padding: '0 14px', fontSize: 13 }}>저장</button>
                            <button type="button" onClick={() => setEditingEvent(null)} style={{ height: 36, padding: '0 10px', fontSize: 13, background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, cursor: 'pointer' }}>취소</button>
                          </form>
                        ) : (
                          <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{ev.name}</p>
                              <p style={{ fontSize: 13, color: '#86868b' }}>
                                {ev.date}{ev.end_date ? ` ~ ${ev.end_date}` : ''}
                              </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                              <button onClick={() => setEditingEvent({ id: ev.id, name: ev.name, date: ev.date?.split('T')[0] || ev.date, end_date: ev.end_date?.split('T')[0] || ev.end_date || '' })} style={{ fontSize: 13, color: '#0066cc', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>수정</button>
                              <button onClick={() => handleDeleteEvent(ev.id)} style={{ fontSize: 13, color: '#ff3b30', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>삭제</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {events.length === 0 && (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#86868b', fontSize: 15 }}>
                        등록된 이벤트가 없습니다.
                      </div>
                    )}
                  </div>

                  {/* 이벤트 추가 폼 */}
                  <div className="utility-card">
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 20, color: '#1d1d1f' }}>새 이벤트 추가</p>
                    <div>
                      <div className="apple-input-group">
                        <label className="apple-label">이벤트 이름</label>
                        <input className="apple-input" value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} placeholder="예: 서울 코믹월드 10월" />
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">시작일</label>
                        <input className="apple-input" type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })} />
                      </div>
                      <div className="apple-input-group">
                        <label className="apple-label">종료일</label>
                        <input className="apple-input" type="date" value={eventForm.end_date} onChange={e => setEventForm({ ...eventForm, end_date: e.target.value })} />
                      </div>
                      <motion.button whileTap={{ scale: 0.97 }} type="button" onClick={handleAddEvent} className="btn-apple btn-primary w-full" style={{ height: 44, fontSize: 15, marginTop: 8 }}>
                        추가하기
                      </motion.button>
                      {eventFormMsg && (
                        <p style={{ marginTop: 10, fontSize: 13, color: eventFormMsg.startsWith('오류') ? '#ff3b30' : eventFormMsg === '추가됐어요!' ? '#34c759' : '#86868b', textAlign: 'center' }}>
                          {eventFormMsg}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Login Modal ── */}
      <AnimatePresence>
        {showLogin && !isSignedIn && (
          <motion.div
            key="login-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '0 16px' }}
            onClick={e => e.target === e.currentTarget && setShowLogin(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <SignIn
                appearance={{
                  elements: {
                    rootBox: { boxShadow: 'none' },
                    card: { boxShadow: '0 8px 40px rgba(0,0,0,0.12)', borderRadius: 18 },
                  }
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer style={{ background: '#f5f5f7', padding: 'clamp(40px,6vw,64px) 0', marginTop: 'auto' }}>
        <div className="container-apple" style={{ borderTop: '1px solid #e0e0e0', paddingTop: 32 }}>
          <p style={{ fontSize: 12, color: '#7a7a7a', lineHeight: 1.8 }}>
            Copyright © 2026 OtaFetch Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
