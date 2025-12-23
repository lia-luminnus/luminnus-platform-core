
import React, { useState, useContext, useEffect, useMemo } from 'react';
import Header from './Header';
import { LanguageContext } from '../App';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Property {
  id: string;
  address: string;
  city: string;
  type: 'House' | 'Apartment' | 'Condo' | 'Office';
  status: 'For Sale' | 'For Rent' | 'Sold';
  price: number;
  bedrooms: number;
  date: string;
  images: string[];
}

const initialProperties: Property[] = [
  {
    id: '1',
    address: '123 Maple Street',
    city: 'Springfield, IL',
    type: 'House',
    status: 'For Sale',
    price: 250000,
    bedrooms: 3,
    date: '2023-10-26',
    images: [
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1484154218962-a1c002085d2f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: '2',
    address: '456 Oak Avenue, Apt 5B',
    city: 'Metropolis, CA',
    type: 'Apartment',
    status: 'For Rent',
    price: 1800,
    bedrooms: 2,
    date: '2023-10-24',
    images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ]
  },
  {
    id: '3',
    address: '789 Pine Lane',
    city: 'Evergreen, CO',
    type: 'Condo',
    status: 'Sold',
    price: 475000,
    bedrooms: 4,
    date: '2023-10-22',
    images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'
    ]
  }
];

const Properties: React.FC = () => {
  const { t } = useContext(LanguageContext);
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  
  // Advanced Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Any Type');
  const [statusFilter, setStatusFilter] = useState('Any Status');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [bedroomsFilter, setBedroomsFilter] = useState<string>('Any');

  // Modal State (Add/Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProp, setCurrentProp] = useState<Partial<Property>>({});
  const [imageUrlsText, setImageUrlsText] = useState('');

  // Gallery Carousel State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeGalleryImages, setActiveGalleryImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
        const matchesSearch = p.address.toLowerCase().includes(search.toLowerCase()) || 
                              p.city.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'Any Type' || p.type === typeFilter;
        const matchesStatus = statusFilter === 'Any Status' || p.status === statusFilter;
        
        const price = p.price;
        const min = minPrice !== '' ? Number(minPrice) : 0;
        const max = maxPrice !== '' ? Number(maxPrice) : Infinity;
        const matchesPrice = price >= min && price <= max;

        const beds = bedroomsFilter === 'Any' ? 0 : Number(bedroomsFilter.replace('+', ''));
        const matchesBedrooms = p.bedrooms >= beds;

        return matchesSearch && matchesType && matchesStatus && matchesPrice && matchesBedrooms;
    });
  }, [properties, search, typeFilter, statusFilter, minPrice, maxPrice, bedroomsFilter]);

  const handleSave = () => {
    if (!currentProp.address || !currentProp.city) {
        toast.error('O endereço e a cidade são obrigatórios.');
        return;
    }

    const processedImages = imageUrlsText
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

    const updatedPropData = { 
        ...currentProp, 
        images: processedImages.length > 0 ? processedImages : [`https://picsum.photos/seed/${Date.now()}/800/600`] 
    };

    if (currentProp.id) {
        // Edit existing
        setProperties(prev => prev.map(p => p.id === currentProp.id ? { ...p, ...updatedPropData } as Property : p));
        toast.success('Imóvel atualizado com sucesso!');
    } else {
        // Create new
        const newProp: Property = {
            ...updatedPropData as Property,
            id: `prop-${Date.now()}`,
            date: new Date().toLocaleDateString(),
            type: currentProp.type || 'House',
            status: currentProp.status || 'For Sale',
            price: currentProp.price || 0,
            bedrooms: currentProp.bedrooms || 0,
        };
        setProperties(prev => [newProp, ...prev]);
        toast.success('Novo imóvel adicionado ao portfólio!');
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Tem certeza que deseja remover este imóvel permanentemente?')) {
          setProperties(prev => prev.filter(p => p.id !== id));
          toast.success('Imóvel removido.');
      }
  };

  const openEditModal = (prop?: Property) => {
      if (prop) {
          setCurrentProp(prop);
          setImageUrlsText(prop.images.join('\n'));
      } else {
          setCurrentProp({ 
              address: '', 
              city: '', 
              type: 'House', 
              status: 'For Sale', 
              price: 0, 
              bedrooms: 0,
              images: [] 
          });
          setImageUrlsText('');
      }
      setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'For Sale': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
          case 'For Rent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
          case 'Sold': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  const openGallery = (images: string[], index = 0) => {
      setActiveGalleryImages(images);
      setActiveImageIndex(index);
      setIsGalleryOpen(true);
      setDirection(0);
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setActiveImageIndex(prevIndex => (prevIndex + newDirection + activeGalleryImages.length) % activeGalleryImages.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isGalleryOpen) return;
        if (e.key === 'ArrowRight') paginate(1);
        if (e.key === 'ArrowLeft') paginate(-1);
        if (e.key === 'Escape') setIsGalleryOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, activeGalleryImages.length]);

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 1000 : -1000, opacity: 0 }),
    center: { zIndex: 1, x: 0, opacity: 1 },
    exit: (direction: number) => ({ zIndex: 0, x: direction < 0 ? 1000 : -1000, opacity: 0 })
  };

  return (
    <div className="flex flex-col h-full font-sans bg-gray-50 dark:bg-dark-bg transition-colors duration-300 overflow-hidden">
      <Header title={t('properties')} />
      
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto scroll-smooth">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Properties</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Gerencie seu portfólio de imóveis com facilidade e precisão.</p>
            </div>
            <div className="flex gap-4">
                <div className="flex bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-1 shadow-sm">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-brand-primary'}`}>
                        <span className="material-symbols-outlined block">grid_view</span>
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-400 hover:text-brand-primary'}`}>
                        <span className="material-symbols-outlined block">format_list_bulleted</span>
                    </button>
                </div>
                <button 
                    onClick={() => openEditModal()}
                    className="bg-brand-primary text-white font-black py-3 px-8 rounded-2xl flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-brand-primary/20 active:scale-95 uppercase tracking-widest text-xs"
                >
                    <span className="material-symbols-outlined">add</span>
                    Adicionar Imóvel
                </button>
            </div>
         </div>

         {/* Advanced Filters Bar */}
         <div className="mb-8 glass-panel bg-white dark:bg-white/5 p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm transition-all" 
                        placeholder="Busque por endereço, cidade..." 
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <select 
                        className="w-full lg:w-44 py-3 px-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm font-medium"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option>Any Type</option>
                        <option>Apartment</option>
                        <option>House</option>
                        <option>Condo</option>
                        <option>Office</option>
                    </select>
                    <select 
                        className="w-full lg:w-44 py-3 px-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm font-medium"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option>Any Status</option>
                        <option>For Sale</option>
                        <option>For Rent</option>
                        <option>Sold</option>
                    </select>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Price Range:</span>
                    <div className="flex items-center bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                        <input 
                            type="number" 
                            placeholder="Min" 
                            value={minPrice}
                            onChange={(e) => setMinPrice(e.target.value)}
                            className="w-24 px-3 py-2 bg-transparent focus:outline-none text-sm font-medium text-gray-700 dark:text-gray-200"
                        />
                        <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />
                        <input 
                            type="number" 
                            placeholder="Max" 
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-24 px-3 py-2 bg-transparent focus:outline-none text-sm font-medium text-gray-700 dark:text-gray-200"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Bedrooms:</span>
                    <select 
                        className="w-full md:w-32 py-2 px-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary focus:outline-none text-sm font-medium"
                        value={bedroomsFilter}
                        onChange={(e) => setBedroomsFilter(e.target.value)}
                    >
                        <option value="Any">Any</option>
                        <option value="1+">1+ Quarto</option>
                        <option value="2+">2+ Quartos</option>
                        <option value="3+">3+ Quartos</option>
                        <option value="4+">4+ Quartos</option>
                    </select>
                </div>

                <button 
                    onClick={() => {
                        setSearch('');
                        setTypeFilter('Any Type');
                        setStatusFilter('Any Status');
                        setMinPrice('');
                        setMaxPrice('');
                        setBedroomsFilter('Any');
                    }}
                    className="text-xs font-bold text-brand-primary hover:underline uppercase tracking-widest ml-auto"
                >
                    Clear Filters
                </button>
            </div>
         </div>

         {/* Content View */}
         <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
                <motion.div 
                    key="grid"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
                >
                    {filteredProperties.map(prop => (
                        <div key={prop.id} className="glass-panel bg-white dark:bg-white/5 rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all group flex flex-col h-full">
                            <div className="relative h-64 overflow-hidden cursor-pointer" onClick={() => openGallery(prop.images)}>
                                <img src={prop.images[0]} alt={prop.address} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 text-white font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">photo_library</span>
                                        Ver Galeria ({prop.images.length})
                                    </div>
                                </div>
                                <div className="absolute top-4 left-4">
                                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg ${getStatusBadge(prop.status)}`}>
                                        {prop.status}
                                    </span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); openEditModal(prop); }} className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/20 text-white hover:bg-brand-primary transition-all">
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-2">{prop.address}</h3>
                                    <p className="text-xl font-black text-brand-primary whitespace-nowrap">
                                        {prop.status === 'For Rent' ? `$${prop.price.toLocaleString()}/m` : `$${prop.price.toLocaleString()}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 mb-6 text-sm">
                                    <p className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">location_on</span>
                                        {prop.city}
                                    </p>
                                    <p className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">bed</span>
                                        {prop.bedrooms} Bed
                                    </p>
                                </div>
                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className="bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg text-gray-500 dark:text-gray-400">{prop.type}</span>
                                    <span className="text-gray-400">{prop.date}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProperties.length === 0 && (
                        <div className="col-span-full py-20 text-center">
                            <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">search_off</span>
                            <p className="text-gray-500 font-bold">Nenhum imóvel corresponde aos seus filtros.</p>
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xl"
                >
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            <tr>
                                <th className="px-8 py-5">Property</th>
                                <th className="px-8 py-5">Type</th>
                                <th className="px-8 py-5">Beds</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Price</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {filteredProperties.map(prop => (
                                <tr key={prop.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => openGallery(prop.images)}>
                                            <div className="relative w-20 h-14 flex-shrink-0 rounded-xl overflow-hidden shadow-md">
                                                <img src={prop.images[0]} alt="Prop" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white text-[10px] font-bold">+{prop.images.length}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white group-hover:text-brand-primary transition-colors">{prop.address}</p>
                                                <p className="text-xs text-gray-500">{prop.city}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 font-medium text-gray-500">{prop.type}</td>
                                    <td className="px-8 py-5 font-bold text-gray-700 dark:text-gray-300">{prop.bedrooms}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${getStatusBadge(prop.status)}`}>
                                            {prop.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 font-black text-brand-primary text-base">
                                        ${prop.price.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEditModal(prop)} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-brand-primary/10 hover:text-brand-primary transition-all">
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(prop.id)} className="p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all">
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* Advanced Carousel Modal */}
      <AnimatePresence>
        {isGalleryOpen && activeGalleryImages.length > 0 && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6"
                onClick={(e) => e.target === e.currentTarget && setIsGalleryOpen(false)}
            >
                <button 
                    onClick={() => setIsGalleryOpen(false)}
                    className="absolute top-8 right-8 text-white/40 hover:text-white bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all z-50 backdrop-blur-md border border-white/10"
                >
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>

                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 text-white font-bold tracking-widest text-xs z-50">
                    {activeImageIndex + 1} / {activeGalleryImages.length}
                </div>

                <div className="relative w-full max-w-7xl h-full flex items-center justify-between">
                    <button 
                        onClick={() => paginate(-1)}
                        className="p-4 rounded-3xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-md border border-white/10 shadow-2xl z-50 group active:scale-95"
                    >
                        <span className="material-symbols-outlined text-4xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
                    </button>

                    <div className="relative flex-1 h-full flex items-center justify-center overflow-hidden px-4">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.img
                                key={activeImageIndex}
                                src={activeGalleryImages[activeImageIndex]}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                                drag="x"
                                dragConstraints={{ left: 0, right: 0 }}
                                dragElastic={1}
                                onDragEnd={(e, { offset, velocity }) => {
                                    const swipe = Math.abs(offset.x) > 50;
                                    if (swipe) paginate(offset.x > 0 ? -1 : 1);
                                }}
                                className="max-w-full max-h-[75vh] object-contain rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 pointer-events-none sm:pointer-events-auto"
                            />
                        </AnimatePresence>
                    </div>

                    <button 
                        onClick={() => paginate(1)}
                        className="p-4 rounded-3xl bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-md border border-white/10 shadow-2xl z-50 group active:scale-95"
                    >
                        <span className="material-symbols-outlined text-4xl group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>
                </div>

                <div className="mt-8 h-24 w-full max-w-5xl overflow-x-auto flex items-center justify-center gap-4 p-4 no-scrollbar z-50">
                    {activeGalleryImages.map((img, idx) => (
                        <motion.button 
                            key={idx}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setDirection(idx > activeImageIndex ? 1 : -1); setActiveImageIndex(idx); }}
                            className={`relative w-20 h-14 flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 ${
                                activeImageIndex === idx ? 'ring-4 ring-brand-primary scale-110 shadow-[0_0_30px_rgba(139,92,246,0.5)]' : 'opacity-40 hover:opacity-100 grayscale hover:grayscale-0'
                            }`}
                        >
                            <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Property Modal */}
      <AnimatePresence>
        {isModalOpen && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 30 }}
                    className="glass-panel bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-[2.5rem] w-full max-w-2xl p-8 lg:p-12 shadow-2xl relative flex flex-col max-h-[90vh]"
                >
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">
                                {currentProp.id ? 'Editar Imóvel' : 'Novo Imóvel'}
                            </h2>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Preencha as informações do ativo imobiliário</p>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-brand-primary transition-all p-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/5">
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                    </div>

                    <div className="space-y-8 overflow-y-auto pr-4 custom-scrollbar flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Endereço Completo</label>
                                <input 
                                    type="text" 
                                    value={currentProp.address || ''}
                                    onChange={(e) => setCurrentProp({...currentProp, address: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                                    placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Cidade / UF</label>
                                <input 
                                    type="text" 
                                    value={currentProp.city || ''}
                                    onChange={(e) => setCurrentProp({...currentProp, city: e.target.value})}
                                    className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-gray-400 font-medium"
                                    placeholder="Ex: São Paulo, SP"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Valor Estimado</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-brand-primary">$</span>
                                    <input 
                                        type="number" 
                                        value={currentProp.price || ''}
                                        onChange={(e) => setCurrentProp({...currentProp, price: Number(e.target.value)})}
                                        className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl pl-10 pr-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-gray-400 font-black"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Quartos (Beds)</label>
                                <input 
                                    type="number" 
                                    value={currentProp.bedrooms || ''}
                                    onChange={(e) => setCurrentProp({...currentProp, bedrooms: Number(e.target.value)})}
                                    className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all placeholder:text-gray-400 font-bold"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Tipo de Ativo</label>
                                <select 
                                    value={currentProp.type || 'House'}
                                    onChange={(e) => setCurrentProp({...currentProp, type: e.target.value as any})}
                                    className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="House">Casa</option>
                                    <option value="Apartment">Apartamento</option>
                                    <option value="Condo">Condomínio</option>
                                    <option value="Office">Comercial / Office</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Status Atual</label>
                                <select 
                                    value={currentProp.status || 'For Sale'}
                                    onChange={(e) => setCurrentProp({...currentProp, status: e.target.value as any})}
                                    className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="For Sale">À Venda</option>
                                    <option value="For Rent">Para Alugar</option>
                                    <option value="Sold">Vendido</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Galerias de Imagens (Uma URL por linha)</label>
                            <textarea 
                                value={imageUrlsText}
                                onChange={(e) => setImageUrlsText(e.target.value)}
                                placeholder="Insira os links das fotos aqui..."
                                className="w-full h-32 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all text-xs font-mono resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-5 mt-12 pt-8 border-t border-gray-100 dark:border-white/5">
                        <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 rounded-2xl text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-black uppercase tracking-widest transition-all">
                            Cancelar
                        </button>
                        <button onClick={handleSave} className="px-10 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-2xl shadow-brand-primary/30 active:scale-95">
                            {currentProp.id ? 'Salvar Alterações' : 'Confirmar e Adicionar'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Properties;
