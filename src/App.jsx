import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// ⚠️ REEMPLAZAR CON TUS CREDENCIALES DE SUPABASE
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xusqmtuijmfxicxbnsgq.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1c3FtdHVpam1meGljeGJuc2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MDA0OTYsImV4cCI6MjA4NTM3NjQ5Nn0.xnu1HFLaK2M2saNf4juE11RWLLwU8csUC2jY6lMR56g';
const supabase = createClient(supabaseUrl, supabaseKey);

const ACCESS_CODE = 'jessi2026';
const SESSION_KEY = 'raffle_auth_session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 días en milisegundos

const PRIZES = [
  '1_remera deportiva de hombre',
  '2_una sudadera de mujer',
  '3_budín de dulce de leche',
  '4_media antideslizante',
  '5_un boxer',
  '6_tarta frutal',
  '7_perfume Monique de hombre',
  '8_perfume de mujer Monique',
  '9_remera de algodón',
  '10_porta sahumerio',
  '11_Una oferta de hamburguesas especial + papas fritas',
  '12_Un alisado'
];

const SELLERS = ['Jessica', 'Rama'];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState('');
  const [numbers, setNumbers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState([]);
  const [buyerName, setBuyerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [seller, setSeller] = useState(SELLERS[0]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Edición
  const [editMode, setEditMode] = useState(false);
  const [editingNumber, setEditingNumber] = useState(null);
  
  // Funcionalidades
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [showBuyersList, setShowBuyersList] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [showBuyerModal, setShowBuyerModal] = useState(false);

  // Verificar sesión guardada al cargar
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const now = new Date().getTime();
        
        // Verificar si la sesión no ha expirado
        if (session.expiresAt > now) {
          setIsAuthenticated(true);
        } else {
          // Sesión expirada, limpiar
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (err) {
        console.error('Error al cargar sesión:', err);
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadNumbers();
    }
  }, [isAuthenticated]);

  const loadNumbers = async () => {
    try {
      const { data, error } = await supabase
        .from('raffle_numbers')
        .select('*')
        .order('number');
      
      if (error) throw error;
      
      const allNumbers = Array.from({ length: 100 }, (_, i) => {
        const num = i + 1;
        const existing = data.find(d => d.number === num);
        return existing || { 
          number: num, 
          is_sold: false,
          buyer_name: null,
          payment_method: null,
          seller: null,
          sold_at: null
        };
      });
      
      setNumbers(allNumbers);
    } catch (err) {
      console.error('Error loading numbers:', err);
      setError('Error al cargar los números');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const trimmedCode = code.trim(); // Quitar espacios automáticamente
    
    if (trimmedCode === ACCESS_CODE) {
      setIsAuthenticated(true);
      setError('');
      
      // Guardar sesión en localStorage
      const session = {
        authenticated: true,
        expiresAt: new Date().getTime() + SESSION_DURATION
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      setError('Código incorrecto');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(SESSION_KEY);
  };

  const handleNumberClick = (num) => {
    const numberData = numbers[num - 1];
    
    // Si está vendido, abrir para editar
    if (numberData.is_sold) {
      setEditingNumber(numberData);
      setBuyerName(numberData.buyer_name);
      setPaymentMethod(numberData.payment_method);
      setSeller(numberData.seller);
      setEditMode(true);
      setShowModal(true);
      return;
    }
    
    // Si no está vendido, seleccionar/deseleccionar
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else {
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const handleBuyNumbers = async () => {
    if (!buyerName.trim()) {
      setError('Ingresa el nombre del comprador');
      return;
    }

    if (!editMode && selectedNumbers.length === 0) {
      setError('Selecciona al menos un número');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editMode) {
        // Actualizar número existente
        const { error } = await supabase
          .from('raffle_numbers')
          .update({
            buyer_name: buyerName.trim(),
            payment_method: paymentMethod,
            seller: seller,
            sold_at: new Date().toISOString()
          })
          .eq('number', editingNumber.number);

        if (error) throw error;
        setSuccess('Número actualizado correctamente');
      } else {
        // Crear nuevas compras
        const updates = selectedNumbers.map(num => ({
          number: num,
          is_sold: true,
          buyer_name: buyerName.trim(),
          payment_method: paymentMethod,
          seller: seller,
          sold_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('raffle_numbers')
          .upsert(updates);

        if (error) throw error;
        setSuccess('Compra registrada correctamente');
      }

      await loadNumbers();
      setShowModal(false);
      setSelectedNumbers([]);
      setBuyerName('');
      setPaymentMethod('transferencia');
      setSeller(SELLERS[0]);
      setEditMode(false);
      setEditingNumber(null);
    } catch (err) {
      console.error('Error saving purchase:', err);
      setError('Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNumber = async () => {
    if (!editingNumber) return;

    if (!confirm('¿Estás seguro de eliminar esta compra?')) return;

    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('raffle_numbers')
        .delete()
        .eq('number', editingNumber.number);

      if (error) {
        console.error('Error de Supabase:', error);
        throw error;
      }
      
      // Limpiar estados ANTES de recargar
      setShowModal(false);
      setEditMode(false);
      setEditingNumber(null);
      setBuyerName('');
      setSelectedNumbers([]);
      
      // Recargar datos
      await loadNumbers();
      
      setSuccess('Compra eliminada correctamente');
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error completo:', err);
      setError(`Error al eliminar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getBuyersGrouped = () => {
    const buyers = numbers
      .filter(n => n.buyer_name)
      .reduce((acc, n) => {
        if (!acc[n.buyer_name]) {
          acc[n.buyer_name] = [];
        }
        acc[n.buyer_name].push(n);
        return acc;
      }, {});

    const grouped = {};
    Object.keys(buyers).sort().forEach(name => {
      const firstLetter = name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push({
        name,
        numbers: buyers[name]
      });
    });

    return grouped;
  };

  const getFilteredNumbers = () => {
    let filtered = [...numbers];

    if (filterStatus === 'vendidos') {
      filtered = filtered.filter(n => n.is_sold);
    } else if (filterStatus === 'disponibles') {
      filtered = filtered.filter(n => !n.is_sold);
    } else if (filterStatus === 'transferencia') {
      filtered = filtered.filter(n => n.payment_method === 'transferencia');
    } else if (filterStatus === 'efectivo') {
      filtered = filtered.filter(n => n.payment_method === 'efectivo');
    } else if (filterStatus === 'fiados') {
      filtered = filtered.filter(n => n.payment_method === 'fiado');
    }

    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.number.toString().includes(searchTerm) ||
        (n.buyer_name && n.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const handleResultClick = (num) => {
    handleNumberClick(num.number);
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="logo-section">
            <h1>SORTEO</h1>
            <div className="prize-amount">$3000 cada número</div>
            <div className="store-name">Alias: unidos.store</div>
          </div>
          
          <form onSubmit={handleLogin}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ingresa el código de acceso"
              className="code-input"
            />
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="login-button">
              INGRESAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredNumbers = getFilteredNumbers();
  const buyersGrouped = getBuyersGrouped();
  const soldCount = numbers.filter(n => n.is_sold).length;
  const availableCount = numbers.filter(n => !n.is_sold).length;
  const transferenciaCount = numbers.filter(n => n.payment_method === 'transferencia').length;
  const efectivoCount = numbers.filter(n => n.payment_method === 'efectivo').length;
  const fiadosCount = numbers.filter(n => n.payment_method === 'fiado').length;

  return (
    <div className="app-container">
      <div className="main-screen">
        <div className="header">
          <h1>SORTEO</h1>
          <button 
            className="logout-button"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            🚪 Salir
          </button>
        </div>

        <div className="prizes-section">
          <h2>Premios</h2>
          <div className="prizes-list">
            {PRIZES.map((prize, idx) => (
              <div key={idx} className="prize-item">
                {prize}
              </div>
            ))}
          </div>
          <div className="prize-footer">
            <span className="price">$3000 cada número</span>
            <span className="alias">Alias: unidos.store</span>
          </div>
        </div>

        <div className="numbers-grid">
          {numbers.map((item) => (
            <button
              key={item.number}
              className={`number-box ${item.is_sold ? 'sold' : 'available'} ${selectedNumbers.includes(item.number) ? 'selected' : ''}`}
              onClick={() => handleNumberClick(item.number)}
            >
              {item.number}
            </button>
          ))}
        </div>

        <div className="actualizado">
          Actualizado 👀
        </div>
      </div>

      <div className="additional-section">
        <button 
          className="new-buyer-button"
          onClick={() => {
            if (selectedNumbers.length > 0) {
              setEditMode(false);
              setEditingNumber(null);
              setShowModal(true);
            } else {
              setError('Selecciona al menos un número');
              setTimeout(() => setError(''), 3000);
            }
          }}
        >
          + NUEVO COMPRADOR
        </button>

        <div className="filters-section">
          <h3>Filtros y Búsqueda</h3>
          
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por número o comprador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filterStatus === 'todos' ? 'active' : ''}`}
              onClick={() => setFilterStatus('todos')}
            >
              Todos ({numbers.length})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'vendidos' ? 'active' : ''}`}
              onClick={() => setFilterStatus('vendidos')}
            >
              Vendidos ({soldCount})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'disponibles' ? 'active' : ''}`}
              onClick={() => setFilterStatus('disponibles')}
            >
              Disponibles ({availableCount})
            </button>
          </div>

          <div className="filter-buttons" style={{marginTop: '8px'}}>
            <button 
              className={`filter-btn ${filterStatus === 'transferencia' ? 'active' : ''}`}
              onClick={() => setFilterStatus('transferencia')}
            >
              💳 Transferencia ({transferenciaCount})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'efectivo' ? 'active' : ''}`}
              onClick={() => setFilterStatus('efectivo')}
            >
              💵 Efectivo ({efectivoCount})
            </button>
            <button 
              className={`filter-btn ${filterStatus === 'fiados' ? 'active' : ''}`}
              onClick={() => setFilterStatus('fiados')}
            >
              📝 Fiados ({fiadosCount})
            </button>
          </div>

          {(searchTerm || filterStatus !== 'todos') && (
            <div className="filtered-results">
              <div className="results-header">
                <span>Resultados: {filteredNumbers.length}</span>
                <button 
                  className="clear-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('todos');
                  }}
                >
                  Limpiar
                </button>
              </div>
              <div className="results-grid">
                {filteredNumbers.map(n => (
                  <div 
                    key={n.number} 
                    className={`result-item ${n.is_sold ? 'sold' : 'available'}`}
                    onClick={() => handleResultClick(n)}
                  >
                    <span className="result-number">#{n.number}</span>
                    {n.is_sold && (
                      <div className="result-info">
                        <span>{n.buyer_name}</span>
                        <span className="result-payment">{n.payment_method}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="buyers-section">
          <button 
            className="buyers-toggle"
            onClick={() => setShowBuyersList(!showBuyersList)}
          >
            📋 Lista de Compradores ({Object.values(buyersGrouped).flat().length})
          </button>

          {showBuyersList && Object.keys(buyersGrouped).length > 0 && (
            <div className="buyers-list">
              {Object.keys(buyersGrouped).sort().map(letter => (
                <div key={letter} className="buyer-group">
                  <div className="group-letter">{letter}</div>
                  {buyersGrouped[letter].map(buyer => (
                    <button
                      key={buyer.name}
                      className="buyer-item"
                      onClick={() => {
                        setSelectedBuyer(buyer);
                        setShowBuyerModal(true);
                      }}
                    >
                      <span className="buyer-name">{buyer.name}</span>
                      <span className="buyer-count">{buyer.numbers.length} número{buyer.numbers.length > 1 ? 's' : ''}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setEditMode(false);
          setEditingNumber(null);
          setSelectedNumbers([]);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editMode ? 'Editar Compra' : 'Nueva Compra'}</h2>
            
            <div className="selected-numbers-display">
              <strong>{editMode ? 'Número:' : 'Números seleccionados:'}</strong>
              <div className="selected-list">
                {editMode 
                  ? `#${editingNumber.number}`
                  : selectedNumbers.sort((a, b) => a - b).join(', ')
                }
              </div>
            </div>

            <div className="form-group">
              <label>Nombre del comprador</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Ingresa el nombre"
              />
            </div>

            <div className="form-group">
              <label>Método de pago</label>
              <div className="payment-buttons">
                <button
                  className={`payment-option ${paymentMethod === 'transferencia' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('transferencia')}
                  type="button"
                >
                  Transferencia
                </button>
                <button
                  className={`payment-option ${paymentMethod === 'efectivo' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('efectivo')}
                  type="button"
                >
                  Efectivo
                </button>
                <button
                  className={`payment-option ${paymentMethod === 'fiado' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('fiado')}
                  type="button"
                >
                  Fiado/Anotado
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Vendedor</label>
              <select value={seller} onChange={(e) => setSeller(e.target.value)}>
                {SELLERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            {editMode ? (
              <div className="edit-actions">
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setEditingNumber(null);
                    setSelectedNumbers([]);
                  }}
                  className="cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteNumber}
                  className="delete-button"
                  disabled={loading}
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
                <button 
                  onClick={handleBuyNumbers}
                  className="confirm-button"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            ) : (
              <div className="modal-buttons">
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setSelectedNumbers([]);
                  }}
                  className="cancel-button"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleBuyNumbers}
                  className="confirm-button"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showBuyerModal && selectedBuyer && (
        <div className="modal-overlay" onClick={() => setShowBuyerModal(false)}>
          <div className="modal-content buyer-details-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Detalles del Comprador</h2>
            
            <div className="buyer-header">
              <div className="buyer-name-large">{selectedBuyer.name}</div>
              <div className="buyer-stats">
                <span>{selectedBuyer.numbers.length} número{selectedBuyer.numbers.length > 1 ? 's' : ''}</span>
                <span>Total: ${selectedBuyer.numbers.length * 3000}</span>
              </div>
            </div>

            <div className="buyer-numbers-list">
              {selectedBuyer.numbers.sort((a, b) => a.number - b.number).map(n => (
                <div 
                  key={n.number} 
                  className="buyer-number-item"
                  onClick={() => {
                    setShowBuyerModal(false);
                    handleNumberClick(n.number);
                  }}
                >
                  <span className="number-badge">#{n.number}</span>
                  <div className="number-details">
                    <span className={`payment-badge ${n.payment_method}`}>
                      {n.payment_method === 'transferencia' && '💳 Transferencia'}
                      {n.payment_method === 'efectivo' && '💵 Efectivo'}
                      {n.payment_method === 'fiado' && '📝 Fiado'}
                    </span>
                    <span className="seller-info">Vendió: {n.seller}</span>
                    {n.sold_at && (
                      <span className="date-info">
                        {new Date(n.sold_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button 
              className="close-modal-button"
              onClick={() => setShowBuyerModal(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {error && !showModal && (
        <div className="toast-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {success && (
        <div className="toast-success">
          {success}
          <button onClick={() => setSuccess('')}>✕</button>
        </div>
      )}
    </div>
  );
}

export default App;