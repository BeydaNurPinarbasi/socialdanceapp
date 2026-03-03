import React, { createContext, useContext, useState, useCallback } from 'react';

export interface MarketplaceProduct {
  id: string;
  title: string;
  price: string;
  /** İlk öğe kapak görseli, liste/detayda kullanılır */
  images: string[];
  category: string;
  description: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
}

// Mock ürünlerde satıcı olarak gösterilecek rastgele kullanıcılar (siz değilsiniz)
const MOCK_SELLERS = [
  { id: 'mock-1', name: 'Ayşe K.', avatar: 'https://i.pravatar.cc/150?u=ayse' },
  { id: 'mock-2', name: 'Mehmet Y.', avatar: 'https://i.pravatar.cc/150?u=mehmet' },
  { id: 'mock-3', name: 'Zeynep A.', avatar: 'https://i.pravatar.cc/150?u=zeynep' },
  { id: 'mock-4', name: 'Can D.', avatar: 'https://i.pravatar.cc/150?u=can' },
  { id: 'mock-5', name: 'Deniz T.', avatar: 'https://i.pravatar.cc/150?u=deniz' },
];

const initialProducts: MarketplaceProduct[] = [
  { id: '1', title: 'Salsa Ayakkabısı', price: '₺450', images: ['https://picsum.photos/seed/salsa-shoe/300/200'], category: 'Ayakkabı', description: 'Profesyonel salsa ayakkabısı, az kullanılmış. Numara 38.', sellerId: MOCK_SELLERS[0].id, sellerName: MOCK_SELLERS[0].name, sellerAvatar: MOCK_SELLERS[0].avatar },
  { id: '2', title: 'Bachata Eteği', price: '₺280', images: ['https://picsum.photos/seed/dance-skirt/300/200'], category: 'Kıyafet', description: 'Dans için özel tasarım bachata eteği. Rahat hareket imkânı.', sellerId: MOCK_SELLERS[1].id, sellerName: MOCK_SELLERS[1].name, sellerAvatar: MOCK_SELLERS[1].avatar },
  { id: '3', title: 'Tango Pabuç', price: '₺520', images: ['https://picsum.photos/seed/tango-shoe/300/200'], category: 'Ayakkabı', description: 'Klasik tango pabuç, topuklu. Numara 37.', sellerId: MOCK_SELLERS[2].id, sellerName: MOCK_SELLERS[2].name, sellerAvatar: MOCK_SELLERS[2].avatar },
];

interface MarketplaceContextValue {
  products: MarketplaceProduct[];
  addProduct: (product: Omit<MarketplaceProduct, 'id'>) => void;
  getProductById: (id: string) => MarketplaceProduct | undefined;
  removeProduct: (id: string) => void;
  updateProduct: (id: string, updates: Partial<Omit<MarketplaceProduct, 'id'>>) => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<MarketplaceProduct[]>(initialProducts);

  const addProduct = useCallback((product: Omit<MarketplaceProduct, 'id'>) => {
    const id = String(Date.now());
    setProducts((prev) => [{ ...product, id }, ...prev]);
  }, []);

  const getProductById = useCallback((id: string) => {
    return products.find((p) => p.id === id);
  }, [products]);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Omit<MarketplaceProduct, 'id'>>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const value: MarketplaceContextValue = {
    products,
    addProduct,
    getProductById,
    removeProduct,
    updateProduct,
  };

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export function useMarketplace(): MarketplaceContextValue {
  const ctx = useContext(MarketplaceContext);
  if (ctx === undefined) {
    throw new Error('useMarketplace must be used within MarketplaceProvider');
  }
  return ctx;
}
