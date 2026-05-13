import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, updateDoc, doc, Timestamp, orderBy, deleteDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, XCircle, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface Car {
  id?: string;
  name: string;
  category: string;
  year: string;
  transmission: string;
  seats: string;
  hp: string;
  speed: string;
  price: string;
  description?: string;
  images: string[];
  createdAt?: any;
}

const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.7)); // compress as webp
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export function FleetManager() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishingState, setPublishingState] = useState<'idle' | 'success'>('idle');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Car>({
    name: '',
    category: 'Featured',
    year: '',
    transmission: 'Auto',
    seats: '4 seats',
    hp: '',
    speed: '',
    price: '',
    description: '',
    images: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'cars'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Car));
      setCars(data);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch cars:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleOpenModal = (car?: Car) => {
    if (car) {
      setEditingCar(car);
      setFormData(car);
    } else {
      setEditingCar(null);
      setFormData({
        name: '',
        category: 'Featured',
        year: '',
        transmission: 'Auto',
        seats: '4 seats',
        hp: '',
        speed: '',
        price: '',
        description: '',
        images: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCar(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files) as File[];
    
    // Convert and compress all files
    try {
      const base64Images = await Promise.all(files.map(file => resizeImage(file)));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...base64Images]
      }));
    } catch (err) {
      console.error("Error compressing images:", err);
      alert("Failed to process some images.");
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      newImages.splice(index, 1);
      return { ...prev, images: newImages };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setPublishingState('idle');
    
    try {
      if (editingCar?.id) {
        await updateDoc(doc(db, 'cars', editingCar.id), {
          ...formData,
          createdAt: editingCar.createdAt || Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'cars'), {
          ...formData,
          createdAt: Timestamp.now()
        });
      }
      setPublishingState('success');
      setTimeout(() => {
        setPublishingState('idle');
        setIsModalOpen(false);
      }, 2500);
    } catch (err: any) {
      console.error("Error saving car:", err);
      alert("Failed to save car. Check your rules.");
      setPublishingState('idle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (carId: string) => {
    try {
      await deleteDoc(doc(db, 'cars', carId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error("Error deleting car:", err);
      alert("Failed to delete car.");
    }
  };

  return (
    <>
      {isModalOpen ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <div>
              <button 
                onClick={handleCloseModal}
                className="text-zinc-400 hover:text-white flex items-center gap-2 mb-4 text-sm font-medium transition-colors"
              >
                <XCircle size={16} /> Back to Fleet
              </button>
              <h2 className="text-3xl font-medium tracking-tight">{editingCar ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <p className="text-zinc-400 mt-1">Fill in the details to list this car.</p>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 md:p-10 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Car Name</label>
                    <input type="text" placeholder="e.g. BMW M4 Competition" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors appearance-none">
                      <option value="Sports">Sports</option>
                      <option value="SUV">SUV</option>
                      <option value="Electric">Electric</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Convertible">Convertible</option>
                      <option value="Featured">Featured</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Year</label>
                    <input type="text" placeholder="e.g. 2024" required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Price per day</label>
                    <input type="text" placeholder="e.g. RM 1450" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Horsepower</label>
                    <input type="text" placeholder="e.g. 503 hp" required value={formData.hp} onChange={e => setFormData({...formData, hp: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">0-100 Speed</label>
                    <input type="text" placeholder="e.g. 3.8s" required value={formData.speed} onChange={e => setFormData({...formData, speed: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Seats</label>
                    <input type="text" placeholder="e.g. 4 seats" required value={formData.seats} onChange={e => setFormData({...formData, seats: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Transmission</label>
                    <input type="text" placeholder="e.g. Auto" required value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  placeholder="Enter a detailed description about the car..." 
                  value={formData.description || ''} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-[#d4ff32] transition-colors min-h-[120px] resize-y" 
                />
              </div>

              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Images</label>
                    <p className="text-xs text-zinc-500 mt-1">First image is the primary display image.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-white/20 px-4 py-2 rounded-full text-sm hover:border-[#d4ff32] hover:text-[#d4ff32] transition-colors"
                  >
                    Upload More
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {formData.images.map((img, i) => (
                    <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/50 border border-white/10 group">
                      <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={`Car preview ${i+1}`} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          type="button" 
                          onClick={() => removeImage(i)}
                          className="bg-red-500/90 text-white rounded-full p-2 hover:bg-red-500 transform hover:scale-110 transition-all font-medium"
                          title="Remove image"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {i === 0 && (
                        <div className="absolute top-2 left-2 bg-[#d4ff32] text-black text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                          Primary
                        </div>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 flex flex-col items-center justify-center text-zinc-400 hover:text-white transition-all"
                  >
                    <Plus size={24} className="mb-2" />
                    <span className="text-xs font-medium">Add Image</span>
                  </button>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  multiple 
                  accept="image/jpeg, image/png, image/webp" 
                  className="hidden" 
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="w-full sm:w-auto bg-white/5 text-white px-8 py-3.5 rounded-full text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving || publishingState === 'success' || formData.name.trim() === '' || formData.images.length === 0}
                  className="w-full sm:flex-1 bg-[#d4ff32] text-black px-8 py-3.5 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-[#c0eb20] hover:shadow-[0_0_15px_rgba(212,255,50,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {publishingState === 'success' ? (
                    <>✓ Published to Live Site!</>
                  ) : saving ? (
                    <><Loader2 size={18} className="animate-spin" /> Publishing to Live Site...</>
                  ) : (editingCar ? 'Update Vehicle' : 'Publish Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden mt-8 animate-in fade-in duration-300">
          <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 gap-4">
            <div>
              <h3 className="text-xl font-medium tracking-tight">Fleet Vehicles</h3>
              <p className="text-sm text-zinc-400 mt-1">Manage listed cars on the website.</p>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="w-full md:w-auto bg-[#d4ff32] text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#c0eb20] hover:shadow-[0_0_15px_rgba(212,255,50,0.3)] transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Plus size={16} /> Add Car
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400 flex flex-col items-center">
              <Loader2 className="animate-spin mb-4" size={24} />
              Loading fleet...
            </div>
          ) : cars.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              No cars in fleet yet. Add one to display it on the main page.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/20 text-zinc-400">
                  <tr>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Car</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Specs</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px]">Price</th>
                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cars.map((car) => (
                    <tr key={car.id!} className="hover:bg-white/5/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-14 rounded-md overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                            {car.images?.length > 0 ? (
                              <img src={car.images[0]} alt={car.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-base">{car.name}</div>
                            <div className="text-xs text-zinc-500 font-medium mt-0.5">{car.year} • {car.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-zinc-400 font-medium whitespace-nowrap">
                          <span>{car.hp} • {car.speed}</span>
                          <span>{car.transmission} • {car.seats}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#d4ff32] whitespace-nowrap">{car.price}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-zinc-400">
                          <button 
                            onClick={() => handleOpenModal(car)}
                            className="bg-white/5 p-2.5 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 rounded-full transition-all"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          {confirmDeleteId === car.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-500 font-medium">Sure?</span>
                              <button 
                                onClick={() => handleDelete(car.id!)}
                                className="bg-red-500 text-black p-2.5 hover:bg-red-400 rounded-full transition-all"
                                title="Confirm Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="bg-white/5 p-2.5 hover:text-white hover:bg-white/10 rounded-full transition-all"
                                title="Cancel"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteId(car.id!)}
                              className="bg-red-500/10 text-red-500 p-2.5 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-500/50 rounded-full transition-all"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
