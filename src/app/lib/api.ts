const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3004/api/v1";

/** Respuesta base del backend */
export type ApiBaseResponse<TData = any> = {
  success: boolean;
  statusCode: number;
  message: string;
  data?: TData;
  timestamp: string;
  executionTime: string;
  validationErrors?: Record<string, string>;
};

/* ========== REGISTER ========== */
/* ========== REGISTER ========== */

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  // ✅ El rol ya no se envía: siempre será "customer" del lado del backend
};

export type RegisterData = {
  access_token: string;
  user: {
    userId: string;
    email: string;
    role: string; // "customer"
  };
};

export type RegisterResponse = ApiBaseResponse<RegisterData>;

export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as RegisterResponse;
  return data;
}

/* ========== LOGIN ========== */
/* ========== LOGIN ========== */

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginData = {
  access_token: string;
  user: {
    userId: string;
    email: string;
    role: string;
  };
};

export type LoginResponse = ApiBaseResponse<LoginData>;

export async function loginUser(
  payload: LoginPayload
): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as LoginResponse;
}

/* ========== SUPPLIERS (ADMIN/EMPLOYEE) ========== */
/* ========== SUPPLIERS (ADMIN/EMPLOYEE) ========== */

export type SupplierAddress = {
  zipCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
};

export type Supplier = {
  id: string;
  name: string;
  email: string;
  phone: string;
  contactName: string;
  isActive: boolean;
  totalAmount: number;
  totalOrders: number;
  lastOrderDate: string | null;
  createdAt: string;
  updatedAt: string;
  address: SupplierAddress;

  // ✅ campos extra que pueden venir en respuestas de suppliers
  paymentTerms?: number;
  volumeDiscount?: number;
  notes?: string;
};

/** ✅ NUEVO: payload para crear proveedor (POST /suppliers) */
export type CreateSupplierPayload = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: SupplierAddress;
  paymentTerms: number;
  volumeDiscount: number;
  notes: string;
};

/**
 * Obtener lista de proveedores.
 * GET /suppliers
 *
 * params:
 *  - active?: "active" | string  -> si se pasa "active", filtra solo activos
 */
export async function getSuppliers(params?: {
  active?: "active" | string;
}): Promise<ApiBaseResponse<Supplier[]>> {
  const searchParams = new URLSearchParams();

  if (params?.active) {
    // Swagger: query param "active" con valor "active"
    searchParams.set("active", params.active);
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/suppliers?${qs}`
    : `${API_BASE_URL}/suppliers`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*", // igual que en el curl
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<Supplier[]>;
}

/**
 * Obtener un proveedor por ID
 * GET /suppliers/{id}
 */
export async function getSupplierById(
  id: string
): Promise<ApiBaseResponse<Supplier>> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const url = `${API_BASE_URL}/suppliers/${id}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*", // igual que en el curl
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<Supplier>;
}

/** ✅ NUEVO: TOP proveedores por volumen (GET /suppliers/top-by-volume) */
export async function getSuppliersTopByVolume(params?: {
  limit?: number | string;
}): Promise<ApiBaseResponse<Supplier[]>> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/suppliers/top-by-volume?${qs}`
    : `${API_BASE_URL}/suppliers/top-by-volume`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<Supplier[]>;
}

/** ✅ NUEVO: AGRUPAR proveedores por términos de pago
 * GET /suppliers/by-payment-terms
 *
 * Respuesta:
 *  data: {
 *    "30": Supplier[],
 *    "60": Supplier[],
 *    ...
 *  }
 */
export type SuppliersByPaymentTerms = Record<string, Supplier[]>;

export async function getSuppliersByPaymentTerms(): Promise<
  ApiBaseResponse<SuppliersByPaymentTerms>
> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const url = `${API_BASE_URL}/suppliers/by-payment-terms`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<SuppliersByPaymentTerms>;
}

/** ✅ NUEVO: crear proveedor (POST /suppliers) */
export async function createSupplier(
  payload: CreateSupplierPayload
): Promise<ApiBaseResponse<Supplier>> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/suppliers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*", // igual que en el curl
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ApiBaseResponse<Supplier>;
}

export async function deleteSupplier(
  id: string
): Promise<ApiBaseResponse<null>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: "DELETE",
    headers: {
      accept: "*/*", // igual que en el curl
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Puede venir 204 sin body, así que leemos como texto
  const raw = await res.text();

  if (raw) {
    try {
      return JSON.parse(raw) as ApiBaseResponse<null>;
    } catch {
      // Si no es JSON pero vino algo, devolvemos algo genérico
      return {
        success: res.ok,
        statusCode: res.status,
        message: raw || "Respuesta no válida del servidor",
        data: null,
        timestamp: new Date().toISOString(),
        executionTime: "",
      };
    }
  }

  // 204 No Content u otra respuesta sin cuerpo
  return {
    success: res.ok,
    statusCode: res.status,
    message: res.ok
      ? "Proveedor eliminado correctamente"
      : "No se pudo eliminar el proveedor",
    data: null,
    timestamp: new Date().toISOString(),
    executionTime: "",
  };
}

/* ========== CUSTOMERS (LISTAR / BUSCAR CLIENTES ADMIN/EMPLOYEE) ========== */

/* ========== CUSTOMERS (LISTAR / BUSCAR CLIENTES ADMIN/EMPLOYEE) ========== */

export type CustomerCommunicationPreferences = {
  sms: boolean;
  whatsapp: boolean;
  phone: boolean;
  email: boolean;
};

export type Customer = {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vipStatus: boolean;
  totalSpent: number;
  averageSpent: number;
  totalVisits: number;
  tags: string[];
  notes: string[];
  preferences: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  communicationPreferences: CustomerCommunicationPreferences;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type CustomersSearchData = {
  success: boolean;
  message: string;
  data: Customer[];
};

export type GetCustomersResponse = ApiBaseResponse<CustomersSearchData>;

/**
 * Lista o busca clientes.
 * GET /customers
 *
 * - q?: string      -> búsqueda por nombre, email, teléfono, empresa
 * - filter?: string -> "vip" | "top"
 * - page?: number   -> número de página
 * - limit?: number  -> ítems por página
 */
export async function getCustomers(params?: {
  q?: string;
  filter?: "vip" | "top" | string;
  page?: number;
  limit?: number;
}): Promise<GetCustomersResponse> {
  const searchParams = new URLSearchParams();

  if (params?.q) {
    searchParams.set("q", params.q);
  }
  if (params?.filter) {
    searchParams.set("filter", params.filter);
  }
  if (typeof params?.page === "number") {
    searchParams.set("page", String(params.page));
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/customers?${qs}`
    : `${API_BASE_URL}/customers`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetCustomersResponse;
}

/* ========== CUSTOMERS (CREAR NUEVO CLIENTE PÚBLICO) ========== */

export type CreateCustomerPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
};

export type CreateCustomerEnvelope = {
  success: boolean;
  message: string;
  data: Customer;
};

export type CreateCustomerResponse = ApiBaseResponse<CreateCustomerEnvelope>;

/**
 * Registra un nuevo cliente con validación de duplicados.
 * POST /customers
 *
 * NO requiere autenticación (según el curl de Swagger).
 */
export async function createCustomer(
  payload: CreateCustomerPayload
): Promise<CreateCustomerResponse> {
  const res = await fetch(`${API_BASE_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*",
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as CreateCustomerResponse;
}

/* ========== TABLES (ENDPOINT PÚBLICO) ========== */

export type Table = {
  id: string;
  number: number;
  capacity: number;
  location: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function getTables(): Promise<ApiBaseResponse<Table[]>> {
  const res = await fetch(`${API_BASE_URL}/tables`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  return (await res.json()) as ApiBaseResponse<Table[]>;
}

/* ========== PRODUCTS (MENÚ PÚBLICO) ========== */





/* ========== PRODUCTS (MENÚ PÚBLICO) ========== */

export type NutritionalInfo = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
};

export type Product = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  price: number;
  categoryId: string;

  status?: string;
  isAvailable: boolean;

  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  preparationTime?: number;
  allergens?: string[];
  nutritionalInfo?: NutritionalInfo;
};

export async function getProducts(params?: {
  available?: boolean;
  category?: string;
}): Promise<ApiBaseResponse<Product[]>> {
  const searchParams = new URLSearchParams();

  if (typeof params?.available === "boolean") {
    searchParams.set("available", String(params.available));
  }
  if (params?.category) {
    searchParams.set("category", params.category);
  }

  const qs = searchParams.toString();
  const url = qs ? `${API_BASE_URL}/products?${qs}` : `${API_BASE_URL}/products`;

  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
  });

  return (await res.json()) as ApiBaseResponse<Product[]>;
}

/* ====== CREATE PRODUCT (POST /products) – SOLO ADMIN ====== */

export type CreateProductPayload = {
  name: string;
  price: number;
  code: string;
  categoryId: string; // UUID
};

export type CreateProductResponse = ApiBaseResponse<Product>;

/**
 * Crea un producto del menú.
 * POST /api/v1/products
 *
 * 👑 SOLO ADMIN
 * Body EXACTO Swagger: { name, price, code, categoryId }
 */
export async function createProduct(
  payload: CreateProductPayload
): Promise<CreateProductResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  if (!token) {
    throw new Error("No hay token. Iniciá sesión como administrador.");
  }

  // ✅ Mandamos SOLO los 4 campos que Swagger acepta
  const body = {
    name: payload.name,
    price: payload.price,
    code: payload.code,
    categoryId: payload.categoryId,
  };

  const res = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return (await res.json()) as CreateProductResponse;
}

/* ====== CREATE PRODUCT (POST /products) – SOLO ADMIN ====== */

export type CreateProductNutritionalInfo = {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
};



/**
 * Crea un producto del menú.
 * POST /api/v1/products
 *
 * 👑 SOLO ADMIN
 * Requiere JWT con rol "admin" (el backend valida el rol).
 */


/* ========== CREATE TABLE (ADMIN) ========== */

export type CreateTablePayload = {
  number: number;
  capacity: number;
  location: string;
};

export async function createTable(
  payload: CreateTablePayload
): Promise<ApiBaseResponse<Table>> {
  // 👇 Leemos el token que guardaste en el login
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/tables`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ApiBaseResponse<Table>;
}

/* ========== TABLE DETAIL (GET BY ID, PÚBLICO) ========== */

export async function getTableById(
  id: string
): Promise<ApiBaseResponse<Table>> {
  const res = await fetch(`${API_BASE_URL}/tables/${id}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  return (await res.json()) as ApiBaseResponse<Table>;
}

/* ========== UPDATE TABLE (ADMIN) ========== */

export type UpdateTablePayload = {
  number: number;
  capacity: number;
  location: string;
  status: string; // "available" | "occupied" | etc. (según el backend)
};

export async function updateTable(
  id: string,
  payload: UpdateTablePayload
): Promise<ApiBaseResponse<Table>> {
  // Leemos el token guardado en el login
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/tables/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ApiBaseResponse<Table>;
}

/* ========== DELETE TABLE (ADMIN) ========== */

export async function deleteTable(
  id: string
): Promise<ApiBaseResponse<null>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/tables/${id}`, {
    method: "DELETE",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // 👇 Leemos como texto para soportar tanto body vacío como JSON
  const raw = await res.text();

  if (raw) {
    // Si vino algo en el body, intento parsear JSON normalmente
    try {
      return JSON.parse(raw) as ApiBaseResponse<null>;
    } catch (e) {
      // Si vino texto pero no es JSON, devolvemos algo genérico
      return {
        success: res.ok,
        statusCode: res.status,
        message: raw || "Respuesta no válida del servidor",
        data: null,
        timestamp: new Date().toISOString(),
        executionTime: "",
      };
    }
  }

  // Si NO hay cuerpo (ej: 204 No Content), devolvemos un objeto sintético
  return {
    success: res.ok,
    statusCode: res.status,
    message: res.ok
      ? "Mesa eliminada correctamente"
      : "No se pudo eliminar la mesa",
    data: null,
    timestamp: new Date().toISOString(),
    executionTime: "",
  };
}

/* ========== ORDERS (LISTADO ADMIN/EMPLOYEE) ========== */


export type OrderItem = {
  // 👇 soportamos ambos nombres, según cómo venga del backend
  id?: string;
  itemId?: string;

  productId: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
};

export type Order = {
  id: string;
  tableId: string;
  tableNumber: number;
  status: string; // "preparing" | "served" | etc (según backend)
  items: OrderItem[];
  total: number;
  createdAt: string;
};
/**
 * Obtiene la lista de pedidos con filtros opcionales.
 * Requiere autenticación (admin o employee).
 *
 * params:
 *  - status?: string        -> ej: "preparing"
 *  - tableId?: string       -> id de la mesa
 *  - date?: string          -> "YYYY-MM-DD"
 *  - limit?: number         -> cantidad por página
 *  - page?: number          -> número de página
 */
export async function getOrders(params?: {
  status?: string;
  tableId?: string;
  date?: string;
  limit?: number;
  page?: number;
  orderType?: string;
  customerId?: string;
}): Promise<ApiBaseResponse<Order[]>> {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }
  if (params?.tableId) {
    searchParams.set("tableId", params.tableId);
  }
  if (params?.date) {
    searchParams.set("date", params.date); // formato YYYY-MM-DD
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  if (typeof params?.page === "number") {
    searchParams.set("page", String(params.page));
  }
  if (params?.orderType) {
    searchParams.set("orderType", params.orderType);
  }
  if (params?.customerId) {
    searchParams.set("customerId", params.customerId);
  }

  const qs = searchParams.toString();
  const url = qs ? `${API_BASE_URL}/orders?${qs}` : `${API_BASE_URL}/orders`;

  // token de admin/employee
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<Order[]>;
}

/* ====== CREATE ORDER (POST /orders) ====== */

export type CreateOrderItemPayload = {
  productId: string;
  quantity: number;
  specialInstructions?: string;
};

export type CreateOrderPayload = {
  tableId?: string; // requerido si orderType = "dine_in"
  customerId?: string;
  orderType: "dine_in" | "takeaway" | "delivery";
  items: CreateOrderItemPayload[];

  // Opcionales según swagger
  waiterId?: string;
  notes?: string;
  discountAmount?: number;
  tipAmount?: number;
};

export type OrderCreatedData = {
  id: string;
  orderNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  // el backend probablemente devuelva más campos, los dejamos flexibles
  [key: string]: any;
};

export type CreateOrderResponse =
  ApiBaseResponse<OrderCreatedData>;

/**
 * Crea una nueva orden.
 * POST /api/v1/orders
 *
 * Requiere autenticación de admin/employee.
 * Efecto colateral: si es dine_in y se manda tableId,
 * el backend marcará la mesa como "occupied".
 */
export async function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as CreateOrderResponse;
}
/**
 * Obtiene la lista de pedidos con filtros opcionales.
 * Requiere autenticación (admin o employee).
 *
 * params:
 *  - status?: string        -> ej: "preparing"
 *  - tableId?: string       -> id de la mesa
 *  - date?: string          -> "YYYY-MM-DD"
 *  - limit?: number         -> cantidad por página
 *  - page?: number          -> número de página
 */


/* ====== UPDATE ORDER ITEMS (PATCH /orders/:id/items) ====== */

export type UpdateOrderItemsPayload = {
  items: {
    productId: string;
    quantity: number; // cantidad FINAL
  }[];
};

export type UpdateOrderItemsResponse = ApiBaseResponse<Order>;

/**
 * Agrega/actualiza items de una orden existente.
 * PATCH /api/v1/orders/:id/items
 *
 * Comportamiento backend:
 * - Si el producto ya existe en la orden → actualiza la cantidad (valor final).
 * - Si el producto no existe → lo agrega como nuevo item.
 */
export async function updateOrderItems(
  orderId: string,
  payload: UpdateOrderItemsPayload
): Promise<UpdateOrderItemsResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/items`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as UpdateOrderItemsResponse;
}


/* ====== DELETE ORDER ITEM (DELETE /orders/:id/items/:itemId) ====== */

export async function deleteOrderItem(
  orderId: string,
  itemId: string
): Promise<ApiBaseResponse<Order | null>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(
    `${API_BASE_URL}/orders/${orderId}/items/${itemId}`,
    {
      method: "DELETE",
      headers: {
        accept: "*/*",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  // Puede venir 200 con JSON o 204 sin body → leemos como texto
  const raw = await res.text();

  if (raw) {
    try {
      return JSON.parse(raw) as ApiBaseResponse<Order | null>;
    } catch {
      return {
        success: res.ok,
        statusCode: res.status,
        message: raw || "Respuesta no válida del servidor",
        data: null,
        timestamp: new Date().toISOString(),
        executionTime: "",
      };
    }
  }

  // Sin body
  return {
    success: res.ok,
    statusCode: res.status,
    message: res.ok
      ? "Item eliminado correctamente de la orden"
      : "No se pudo eliminar el item de la orden",
    data: null,
    timestamp: new Date().toISOString(),
    executionTime: "",
  };
}


export async function getOrderById(
  id: string
): Promise<ApiBaseResponse<Order>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<Order>;
}



/* ========== BILLS (LISTADO ADMIN/EMPLOYEE) ========== */


/**
 * Obtiene la lista de facturas con filtros opcionales.
 * Requiere autenticación (admin o employee).
 *
 * params:
 *  - date?: string          -> "YYYY-MM-DD"
 *  - paymentMethod?: string -> ej: "cash", "card"
 *  - status?: string        -> ej: "paid"
 *  - limit?: number         -> cantidad por página
 *  - page?: number          -> número de página
 */
export async function getBills(params?: {
  date?: string;
  paymentMethod?: string;
  status?: string;
  limit?: number;
  page?: number;
}): Promise<ApiBaseResponse<Bill[]>> {
  const searchParams = new URLSearchParams();

  if (params?.date) {
    searchParams.set("date", params.date);
  }
  if (params?.paymentMethod) {
    searchParams.set("paymentMethod", params.paymentMethod);
  }
  if (params?.status) {
    searchParams.set("status", params.status);
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  if (typeof params?.page === "number") {
    searchParams.set("page", String(params.page));
  }

  const qs = searchParams.toString();
  const url = qs ? `${API_BASE_URL}/bills?${qs}` : `${API_BASE_URL}/bills`;

  // token admin/employee (igual que en orders)
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<Bill[]>;
}


export type PaymentMethod =
  | "cash"
  | "credit_card"
  | "debit_card"
  | "transfer"
  | "digital_wallet";

export type Bill = {
  id: string;
  orderId: string;
  tableNumber: number;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod: string; // "cash" | "card" | etc (según backend)
  status: string; // "paid" | "pending" | etc
  createdAt: string;
};

/** ✅ NUEVO: payload para crear factura (POST /bills) */
export type CreateBillPayload = {
  orderId: string;
  paymentMethod: PaymentMethod;
  paidAmount: number; // Debe ser >= totalAmount
  cashierId?: string;
  discountAmount?: number;
  tipAmount?: number;
};

export type BillCreatedData = {
  id: string;
  billNumber: string;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  status: string;
};

export type CreateBillResponse = ApiBaseResponse<BillCreatedData>;

/**
 * Crea una factura para una orden existente.
 * POST /api/v1/bills
 *
 * Requiere autenticación (admin/employee).
 * Efectos backend:
 *  - Factura creada con todos los items.
 *  - Movimiento financiero SALE registrado.
 *  - Orden ELIMINADA.
 *  - Mesa liberada (status: available).
 */
export async function createBill(
  payload: CreateBillPayload
): Promise<CreateBillResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/bills`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as CreateBillResponse;
}


export type DirectSaleItemPayload = {
  productId: string;
  quantity: number;
};

export type CreateDirectSalePayload = {
  items: DirectSaleItemPayload[];
  paymentMethod: PaymentMethod;
  paidAmount: number;
  customerId?: string;    // Opcional
  cashierId?: string;     // Opcional
  discountAmount?: number; // Opcional
  notes?: string;         // Opcional
};

export type DirectSaleBillData = {
  id: string;
  billNumber: string;
  orderId: string;      // "DIRECT_SALE"
  totalAmount: number;
  status: string;
  [key: string]: any;   // por si el backend agrega más campos
};

export type CreateDirectSaleResponse =
  ApiBaseResponse<DirectSaleBillData>;

/**
 * Crea una factura de venta directa (sin mesa, sin orden previa).
 * POST /api/v1/bills/direct-sale
 *
 * Requiere autenticación (admin/employee).
 * Ideal para takeaway / venta rápida.
 */
export async function createDirectSaleBill(
  payload: CreateDirectSalePayload
): Promise<CreateDirectSaleResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/bills/direct-sale`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as CreateDirectSaleResponse;
}

/* ========== BILL TICKET (GET /bills/:id/ticket) ========== */

export type BillTicketProduct = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
};

export type BillTicket = {
  billNumber: string;
  fecha: string;        // ISO string
  tipoVenta: string;    // ej: "Mesa 5", "Delivery", etc.
  mesa?: number;
  cliente: string;      // "Juan Pérez" o "Consumidor Final"
  productos: BillTicketProduct[];
  subtotal: number;
  impuestos: number;
  total: number;
  metodoPago: string;   // "cash", "credit_card", etc.
  montoPagado: number;
  cambio: number;
};

export type GetBillTicketResponse = ApiBaseResponse<BillTicket>;

/**
 * Obtiene la información del ticket de una factura.
 * GET /api/v1/bills/:id/ticket
 *
 * Requiere autenticación (admin/employee).
 */
export async function getBillTicket(
  id: string
): Promise<GetBillTicketResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/bills/${id}/ticket`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetBillTicketResponse;
}



/* ========== INVENTORY (LISTADO + CREATE ADMIN/EMPLOYEE) ========== */

export type InventoryItem = {
  id: string;

  // campos básicos
  itemName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  costPerUnit: number;
  supplierId: string;
  location: string;
  lastStockUpdate: string;

  // campos extra que pueden venir en POST /inventory
  productId?: string;
  expirationDate?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;

  // 👇 NUEVO: usado por /inventory/low-stock
  needsRestock?: boolean;
};

export type CreateInventoryPayload = {
  productId: string;
  itemName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  costPerUnit: number;
  supplierId: string;
  expirationDate: string; // ISO 8601
  location: string;
  notes: string;
};

/** ✅ NUEVO: payload para PATCH /inventory/{id} */
export type UpdateInventoryPayload = Partial<CreateInventoryPayload>;

/**
 * Obtiene la lista de artículos de inventario.
 * Requiere autenticación (admin o employee).
 *
 * params:
 *  - lowStock?: boolean -> true = solo bajo stock, false/undefined = todo
 */
export async function getInventory(params?: {
  lowStock?: boolean;
}): Promise<ApiBaseResponse<InventoryItem[]>> {
  const searchParams = new URLSearchParams();

  if (typeof params?.lowStock === "boolean") {
    // el backend espera "true"/"false" en query
    searchParams.set("lowStock", String(params.lowStock));
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/inventory?${qs}`
    : `${API_BASE_URL}/inventory`;

  // token admin/employee
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryItem[]>;
}

/**
 * Crea un nuevo artículo en el inventario.
 * Solo administradores pueden crear artículos.
 * El backend registra automáticamente el movimiento inicial de stock.
 */
export async function createInventory(
  payload: CreateInventoryPayload
): Promise<ApiBaseResponse<InventoryItem>> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ApiBaseResponse<InventoryItem>;
}

/** ✅ NUEVO: ACTUALIZAR ARTÍCULO EXISTENTE (PATCH /inventory/{id}) */
export async function updateInventoryItem(
  id: string,
  payload: UpdateInventoryPayload
): Promise<ApiBaseResponse<InventoryItem>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  // ✅ LIMPIEZA DE PAYLOAD:
  // - quitamos undefined / null
  // - quitamos strings vacías
  // - NO enviamos productId ni expirationDate para evitar errores de validación
  const cleanPayload: Partial<UpdateInventoryPayload> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (key === "productId" || key === "expirationDate") return;
    (cleanPayload as any)[key] = value;
  });

  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cleanPayload),
  });

  return (await res.json()) as ApiBaseResponse<InventoryItem>;
}

/** ✅ NUEVO: ELIMINAR ARTÍCULO (DELETE /inventory/{id}) */
export async function deleteInventoryItem(
  id: string
): Promise<ApiBaseResponse<null>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: "DELETE",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const raw = await res.text();

  if (raw) {
    try {
      return JSON.parse(raw) as ApiBaseResponse<null>;
    } catch {
      return {
        success: res.ok,
        statusCode: res.status,
        message: raw || "Respuesta no válida del servidor",
        data: null,
        timestamp: new Date().toISOString(),
        executionTime: "",
      };
    }
  }

  return {
    success: res.ok,
    statusCode: res.status,
    message: res.ok
      ? "Artículo de inventario eliminado correctamente"
      : "No se pudo eliminar el artículo de inventario",
    data: null,
    timestamp: new Date().toISOString(),
    executionTime: "",
  };
}

/**
 * Retorna SOLO los artículos que están por debajo del stock mínimo.
 * GET /inventory/low-stock
 */
export async function getInventoryLowStock(): Promise<
  ApiBaseResponse<InventoryItem[]>
> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory/low-stock`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryItem[]>;
}

// ====== INVENTORY VALUE (RESUMEN DE VALOR TOTAL) ======

export type InventoryValueSummary = {
  totalValue: number;
  currency: string;
  itemCount?: number;
  averageValuePerItem?: number;
};

/**
 * Calcula el valor total del inventario basado en el stock actual
 * y el costo por unidad de cada artículo.
 * GET /inventory/value
 * Solo para administradores.
 */
export async function getInventoryValue(): Promise<
  ApiBaseResponse<InventoryValueSummary>
> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory/value`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryValueSummary>;
}

export type InventoryMovement = {
  id: string;
  inventoryItemId: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  movementDate: string;
  reason: string; // ej: "inventory_count"
  type: string; // ej: "adjustment", "sale", "purchase", etc.
  reference?: string; // ej: "order-123" para ventas
};

export async function getInventoryMovements(params?: {
  itemId?: string;
}): Promise<ApiBaseResponse<InventoryMovement[]>> {
  const searchParams = new URLSearchParams();

  if (params?.itemId) {
    // el backend (Swagger) espera "itemId" como query param
    searchParams.set("itemId", params.itemId);
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/inventory/movements?${qs}`
    : `${API_BASE_URL}/inventory/movements`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryMovement[]>;
}

/**
 * Obtiene un artículo de inventario por ID.
 * GET /inventory/{id}
 * Requiere autenticación (admin o employee).
 */
export async function getInventoryById(
  id: string
): Promise<ApiBaseResponse<InventoryItem>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryItem>;
}

/**
 * Ajustar stock manualmente de un artículo.
 * POST /inventory/{id}/adjust-stock
 * Solo administradores.
 */
export type AdjustStockPayload = {
  quantity: number; // puede ser positivo o negativo
  reason: string;
  notes?: string;
};

export async function adjustInventoryStock(
  id: string,
  payload: AdjustStockPayload
): Promise<ApiBaseResponse<InventoryItem>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory/${id}/adjust-stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ApiBaseResponse<InventoryItem>;
}

/**
 * ✅ NUEVO: registrar consumo de stock (venta / preparación de platos)
 * POST /inventory/{id}/consume
 * Disponible para administradores y empleados.
 */
export type ConsumeStockPayload = {
  quantity: number;
  reference?: string; // ej: "order-123"
};

export type ConsumeStockResult = {
  id: string;
  previousStock: number;
  newStock: number;
  consumed: number;
};

export async function consumeInventoryItem(
  id: string,
  payload: ConsumeStockPayload
): Promise<ApiBaseResponse<ConsumeStockResult>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/inventory/${id}/consume`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as ApiBaseResponse<ConsumeStockResult>;
}

/* ========== RESERVATIONS (LISTADO ADMIN/EMPLOYEE) ========== */

// ⭐ Tipos para reservas.
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "cancelled"
  | "no-show"; // 👈 por si el backend usa este estado

export type Reservation = {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  tableId?: string;
  tableNumber?: number;
  status: ReservationStatus;
  date: string; // ISO (fecha/hora de la reserva)
  guests: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

// Meta de paginación que devuelve el backend dentro de data.meta
export type ReservationsMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

// Estructura interna que viene en data.data
export type ReservationsListData = {
  data: Reservation[];
  meta: ReservationsMeta;
};

// Estructura completa dentro del "data" de ApiBaseResponse
export type ReservationsEnvelope = {
  success: boolean;
  message: string;
  data: ReservationsListData;
};

// Tipado de la respuesta final de nuestro helper
export type GetReservationsResponse = ApiBaseResponse<ReservationsEnvelope>;

/**
 * Obtiene reservas con filtros opcionales.
 * GET /reservations
 *
 * Filtros normales (según Swagger):
 *  - status?: "pending" | "confirmed" | "seated" | "completed" | "cancelled"
 *  - date?: string (YYYY-MM-DD)
 *  - customerId?: string
 *  - tableNumber?: number
 *  - page?: number
 *  - limit?: number
 *
 * ⚠️ NO mandamos filter / hours porque el DTO no los acepta.
 */
export async function getReservations(params?: {
  status?: string;
  date?: string; // YYYY-MM-DD
  customerId?: string;
  tableNumber?: number | string;
  page?: number;
  limit?: number;
}): Promise<GetReservationsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  // ⬅️ CAMBIO IMPORTANTE:
  // el backend filtra por reservationDate, no por "date"
  if (params?.date) {
    searchParams.set("reservationDate", params.date);
  }

  if (params?.customerId) {
    searchParams.set("customerId", params.customerId);
  }
  if (params?.tableNumber !== undefined) {
    searchParams.set("tableNumber", String(params.tableNumber));
  }
  if (typeof params?.page === "number") {
    searchParams.set("page", String(params.page));
  }
  if (typeof params?.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/reservations?${qs}`
    : `${API_BASE_URL}/reservations`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetReservationsResponse;
}

/* ========== RESERVATIONS (DETALLE POR ID ADMIN/EMPLOYEE) ========== */

/**
 * Tipo que representa la reserva COMPLETA que devuelve:
 * GET /reservations/{id}
 */
export type ReservationDetail = {
  specialRequests: string[];
  status: ReservationStatus | string;
  reservationTime: string;
  createdAt: string;
  updatedBy: string;
  customerDetails: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  dietaryRestrictions: string[];
  createdBy: string;
  confirmationCode: string;
  internalNotes: string[];
  reservationDate: string;
  partySize: number;
  actualSpend: number;
  updatedAt: string;
  reservationId: string;
  allergies: string[];
  remindersSent: string[];
  duration: number;
  tags: string[];
  tableId?: string;
  tableNumber?: number;
};

export type ReservationDetailEnvelope = {
  success: boolean;
  message: string;
  data: ReservationDetail;
};

export type GetReservationByIdResponse =
  ApiBaseResponse<ReservationDetailEnvelope>;

/**
 * Obtiene detalles completos de una reserva específica.
 * GET /reservations/{id}
 */
export async function getReservationById(
  id: string
): Promise<GetReservationByIdResponse> {
  // token admin/employee para la cabecera Authorization, igual que en Swagger
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const url = `${API_BASE_URL}/reservations/${id}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetReservationByIdResponse;
}

/* ✅ PATCH /reservations/{id} (sigue existiendo, por si lo usás en otro lado) */

export type UpdateReservationPayload = Partial<{
  status: ReservationStatus | string;
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  specialRequests: string[];
  dietaryRestrictions: string[];
  allergies: string[];
  internalNotes: string[];
  tags: string[];
  actualSpend: number;
  tableId: string;          // 👈 NUEVO: para mover de mesa
}>;

export type UpdateReservationResponse =
  ApiBaseResponse<ReservationDetailEnvelope>;

/**
 * PATCH /reservations/{id}
 * Uso interno (admin/employee) para actualizar campos de la reserva
 * (fecha, hora, partySize, tableId, etc.)
 */
export async function updateReservation(
  id: string,
  payload: UpdateReservationPayload
): Promise<UpdateReservationResponse> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const cleanPayload: any = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (Array.isArray(value) && value.length === 0) return;
    cleanPayload[key] = value;
  });

  const res = await fetch(`${API_BASE_URL}/reservations/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cleanPayload),
  });

  return (await res.json()) as UpdateReservationResponse;
}

/**
 * ✅ NUEVO:
 * PATCH /reservations?code=ABC123&action=update
 * Endpoint PÚBLICO: actualizar por código de confirmación.
 */
export type UpdateReservationByCodePayload = Partial<{
  reservationDate: string;
  reservationTime: string;
  partySize: number;
  tableId: string;
}>;

export async function updateReservationByCode(
  code: string,
  payload: UpdateReservationByCodePayload
): Promise<UpdateReservationResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("code", code);
  searchParams.set("action", "update");

  const cleanPayload: any = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    cleanPayload[key] = value;
  });

  const url = `${API_BASE_URL}/reservations?${searchParams.toString()}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*", // público -> SIN Authorization
    },
    body: JSON.stringify(cleanPayload),
  });

  return (await res.json()) as UpdateReservationResponse;
}

/* ✅ NUEVO: PATCH /reservations/{id}/status?action=... */

export type ReservationStatusAction =
  | "confirm"
  | "seat"
  | "complete"
  | "cancel"
  | "no-show";

export type UpdateReservationStatusParams = {
  action: ReservationStatusAction;
  tableId?: string; // para action=seat
  actualSpend?: number; // para action=complete
  reason?: string; // para action=cancel
};

export async function updateReservationStatus(
  id: string,
  params: UpdateReservationStatusParams
): Promise<UpdateReservationResponse> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("action", params.action);

  if (params.tableId) {
    searchParams.set("tableId", params.tableId);
  }
  if (typeof params.actualSpend === "number") {
    searchParams.set("actualSpend", String(params.actualSpend));
  }
  if (params.reason) {
    searchParams.set("reason", params.reason);
  }

  const qs = searchParams.toString();
  const url = `${API_BASE_URL}/reservations/${id}/status?${qs}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as UpdateReservationResponse;
}

/* ========== RESERVATIONS (CREAR RESERVA PÚBLICA) ========== */

export type CreateReservationPayload = {
  // 🔹 Requeridos
  partySize: number;          // 1–20
  reservationDate: string;    // "YYYY-MM-DD"
  reservationTime: string;    // "HH:mm"

  // 🔹 Opcional (vos la mandás solo si hay datos)
  customerDetails?: ReservationCustomerDetails;

  // Opcionales según backend
  customerId?: string;
  tableId?: string;
  tableNumber?: number;
  duration?: number;
  preferredSeatingArea?: string;
  specialRequests?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
};

export type ReservationCreatedData = {
  reservationId: string;
  confirmationCode: string;
  partySize: number;
  reservationDate: string;
  reservationTime: string;
  duration: number;
  status: ReservationStatus;
  specialRequests: string[];
  dietaryRestrictions: string[];
  allergies: string[];
  actualSpend: number;
  remindersSent: string[];
  tags: string[];
  internalNotes: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type CreateReservationResponse =
  ApiBaseResponse<ReservationCreatedData>;
/**
 * Crea una nueva reserva verificando disponibilidad automáticamente.
 * POST /reservations
 */
export async function createReservation(
  payload: CreateReservationPayload
): Promise<CreateReservationResponse> {
  const res = await fetch(`${API_BASE_URL}/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as CreateReservationResponse;
}

export async function deleteReservation(
  id: string
): Promise<ApiBaseResponse<null>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/reservations/${id}`, {
    method: "DELETE",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Puede venir 204 sin body, así que leemos como texto
  const raw = await res.text();

  if (raw) {
    try {
      return JSON.parse(raw) as ApiBaseResponse<null>;
    } catch {
      return {
        success: res.ok,
        statusCode: res.status,
        message: raw || "Respuesta no válida del servidor",
        data: null,
        timestamp: new Date().toISOString(),
        executionTime: "",
      };
    }
  }

  // 204 No Content u otra respuesta sin cuerpo
  return {
    success: res.ok,
    statusCode: res.status,
    message: res.ok
      ? "Reserva eliminada correctamente"
      : "No se pudo eliminar la reserva",
    data: null,
    timestamp: new Date().toISOString(),
    executionTime: "",
  };
}

export async function getReservationByCode(
  code: string
): Promise<GetReservationByIdResponse> {
  // Endpoint público:
  // GET /api/v1/reservations?code=ABC123
  const searchParams = new URLSearchParams();
  searchParams.set("code", code);

  const url = `${API_BASE_URL}/reservations?${searchParams.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*", // igual que en Swagger
      // ⚠️ IMPORTANTE: SIN Authorization -> público
    },
  });

  return (await res.json()) as GetReservationByIdResponse;
}

/* ========== CUSTOMERS (DETALLE / OBTENER CLIENTE POR ID) ========== */

export type CustomerDetailEnvelope = {
  success: boolean;
  message: string;
  data: Customer;
};

export type GetCustomerByIdResponse =
  ApiBaseResponse<CustomerDetailEnvelope>;

/**
 * Obtiene el perfil completo de un cliente por ID.
 * GET /customers/{id}
 *
 * Requiere token (admin/employee), igual que el curl de Swagger.
 */
export async function getCustomerById(
  id: string
): Promise<GetCustomerByIdResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const url = `${API_BASE_URL}/customers/${id}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetCustomerByIdResponse;
}

/* ========== CUSTOMERS (ACTUALIZAR CLIENTE POR ID) ========== */

export type UpdateCustomerPayload = Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  vipStatus: boolean;
  tags: string[];
  notes: string[];
  preferences: string[];
  allergies: string[];
  dietaryRestrictions: string[];
}>;

export type UpdateCustomerEnvelope = {
  success: boolean;
  message: string;
  data: Customer;
};

export type UpdateCustomerResponse = ApiBaseResponse<UpdateCustomerEnvelope>;

/**
 * Actualiza información del cliente.
 * PATCH /customers/{id}
 *
 * Requiere token (admin/employee), igual que en Swagger.
 */
export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload
): Promise<UpdateCustomerResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  // Limpieza de payload: sacamos undefined/null, strings vacíos y arrays vacíos
  const cleanPayload: any = {};
  Object.entries(payload as Record<string, any>).forEach(([key, value]) => {
    if (key === "communicationPreferences") return; // ❌ el DTO no lo acepta

    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    if (Array.isArray(value) && value.length === 0) return;

    cleanPayload[key] = value;
  });

  const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cleanPayload),
  });

  return (await res.json()) as UpdateCustomerResponse;
}

export async function deleteCustomer(
  id: string
): Promise<ApiBaseResponse<null>> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: "DELETE",
    headers: {
      accept: "*/*", // igual que en el curl de Swagger
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // Puede venir 200 con JSON o 204 sin body, así que leemos como texto
  const raw = await res.text();

  if (raw) {
    try {
      return JSON.parse(raw) as ApiBaseResponse<null>;
    } catch {
      return {
        success: res.ok,
        statusCode: res.status,
        message: raw || "Respuesta no válida del servidor",
        data: null,
        timestamp: new Date().toISOString(),
        executionTime: "",
      };
    }
  }

  // 204 No Content u otra respuesta sin cuerpo
  return {
    success: res.ok,
    statusCode: res.status,
    message: res.ok
      ? "Cliente eliminado correctamente"
      : "No se pudo eliminar el cliente",
    data: null,
    timestamp: new Date().toISOString(),
    executionTime: "",
  };
}

/* ========== CUSTOMERS (HISTORIAL DE RESERVAS POR CLIENTE) ========== */

export type GetCustomerReservationsByIdResponse =
  ApiBaseResponse<Reservation[]>;

/**
 * Obtiene todas las reservas (pasadas y futuras) de un cliente.
 * GET /customers/{id}/reservations
 * Requiere token (admin/employee).
 */
export async function getCustomerReservationsById(
  customerId: string
): Promise<GetCustomerReservationsByIdResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const url = `${API_BASE_URL}/customers/${customerId}/reservations`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetCustomerReservationsByIdResponse;
}

/* ========== CUSTOMERS (BÚSQUEDA RÁPIDA POR TELÉFONO) ========== */

export type CustomerByPhoneEnvelope = {
  success: boolean;
  message: string;
  data: Customer;
};

export type GetCustomerByPhoneResponse =
  ApiBaseResponse<CustomerByPhoneEnvelope>;

/**
 * Búsqueda rápida de cliente por número de teléfono.
 * GET /customers/phone/{phone}
 *
 * Ejemplo de curl:
 *  GET /api/v1/customers/phone/%2B543496505299
 *
 * Requiere token (admin).
 */
export async function getCustomerByPhone(
  phone: string
): Promise<GetCustomerByPhoneResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  // Importante: encodeamos el teléfono (para el "+", espacios, etc.)
  const encodedPhone = encodeURIComponent(phone);
  const url = `${API_BASE_URL}/customers/phone/${encodedPhone}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetCustomerByPhoneResponse;
}

/* ========== CUSTOMERS (GESTIÓN CON /customers/{id}/manage) ========== */

export type ManageCustomerAction =
  | "promote-vip"
  | "remove-vip"
  | "add-note"
  | "update-preferences";

export type ManageCustomerEnvelope = {
  success: boolean;
  message: string;
  data: Customer;
};

export type ManageCustomerResponse =
  ApiBaseResponse<ManageCustomerEnvelope>;

/**
 * Gestiona un cliente usando el endpoint:
 * PATCH /customers/{id}/manage?action=...
 *
 * - action = "promote-vip"        -> sin body
 * - action = "remove-vip"         -> sin body
 * - action = "add-note"           -> body: { note: string }
 * - action = "update-preferences" -> body: { sms, whatsapp, phone, email }
 */
export async function manageCustomer(
  id: string,
  action: ManageCustomerAction,
  body?: any
): Promise<ManageCustomerResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("action", action);

  const url = `${API_BASE_URL}/customers/${id}/manage?${searchParams.toString()}`;

  const headers: HeadersInit = {
    accept: "*/*",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const options: RequestInit = {
    method: "PATCH",
    headers,
  };

  // Solo mandamos body si hace falta
  if (body) {
    (options.headers as any)["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  return (await res.json()) as ManageCustomerResponse;
}

/* ========== WAITLIST ========== */

export type WaitlistEntry = {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  createdAt: string;
  estimatedTime?: string;
  notes?: string;
};

export type WaitlistEnvelope = {
  success: boolean;
  message: string;
  data: WaitlistEntry[];
};

export type GetWaitlistResponse = ApiBaseResponse<WaitlistEnvelope>;

/**
 * Obtiene la lista de espera con filtros opcionales.
 * GET /waitlist
 *
 * params:
 * - date?: "YYYY-MM-DD"
 * - stats?: boolean
 */
export async function getWaitlist(params?: {
  date?: string;
  stats?: boolean;
}): Promise<GetWaitlistResponse> {
  const searchParams = new URLSearchParams();

  if (params?.date) {
    searchParams.set("date", params.date);
  }
  if (typeof params?.stats === "boolean") {
    searchParams.set("stats", String(params.stats));
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/waitlist?${qs}`
    : `${API_BASE_URL}/waitlist`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetWaitlistResponse;
}

/* ========== ADMIN DASHBOARD ========== */

export type AdminDashboardData = {
  message?: string;
  sales?: {
    today: number;
    week: number;
    month: number;
  };
  reservations?: {
    today: number;
    pending: number;
    confirmed: number;
    completed: number;
  };
  tables?: {
    total: number;
    available: number;
    occupied: number;
    reserved: number;
  };
  topProducts?: {
    name: string;
    sales: number;
  }[];
  inventoryAlerts?: {
    item: string;
    stock: number;
    minimum: number;
  }[];
  customers?: {
    total: number;
    vip: number;
    newToday: number;
  };
};

/**
 * Dashboard del administrador
 * GET /admin/dashboard
 */
export async function getAdminDashboard(): Promise<
  ApiBaseResponse<AdminDashboardData>
> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    method: "GET",
    headers: {
      accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // si requiere auth
    },
  });

  return (await res.json()) as ApiBaseResponse<AdminDashboardData>;
}

/* 👇👇👇 AÑADIR ESTO NUEVO PARA /stock-movements 👇👇👇 */

export async function getStockMovements(): Promise<
  ApiBaseResponse<InventoryMovement[]>
> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(`${API_BASE_URL}/stock-movements`, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryMovement[]>;
}


/* 👇👇👇 NUEVO: /stock-movements/by-date-range 👇👇👇 */

export async function getStockMovementsByDateRange(params: {
  startDate: string; // ISO string, ej: "2025-12-01T00:00:00.000Z"
  endDate: string;   // ISO string, ej: "2025-12-04T23:59:59.999Z"
}): Promise<ApiBaseResponse<InventoryMovement[]>> {
  const searchParams = new URLSearchParams();
  searchParams.set("startDate", params.startDate);
  searchParams.set("endDate", params.endDate);

  const url = `${API_BASE_URL}/stock-movements/by-date-range?${searchParams.toString()}`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<InventoryMovement[]>;
}


/* ====== RESUMEN DE MOVIMIENTOS /stock-movements/summary ====== */

export type StockMovementsSummary = {
  totalMovements: number;
  byType: Record<string, number>; // ej: { adjustment: 4, sale: 2 }
  totalQuantity: number;
  totalValue: number;
};

export async function getStockMovementsSummary(params: {
  startDate: string; // ISO string, ej: "2025-12-01T00:00:00.000Z"
  endDate: string;   // ISO string, ej: "2025-12-04T23:59:59.999Z"
}): Promise<ApiBaseResponse<StockMovementsSummary>> {
  const searchParams = new URLSearchParams();
  searchParams.set("startDate", params.startDate);
  searchParams.set("endDate", params.endDate);

  const url = `${API_BASE_URL}/stock-movements/summary?${searchParams.toString()}`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<StockMovementsSummary>;
}

/* ====== TOP MOVING ITEMS /stock-movements/top-moving-items ====== */

export type TopMovingItem = {
  inventoryItemId: string;
  totalQuantity: number;
  movementCount: number;
  lastMovement: string;
};

export async function getTopMovingItems(params?: {
  days?: number | string;  // número de días a considerar
  limit?: number | string; // número de artículos a retornar
}): Promise<ApiBaseResponse<TopMovingItem[]>> {
  const searchParams = new URLSearchParams();

  if (params?.days !== undefined) {
    searchParams.set("days", String(params.days));
  }
  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/stock-movements/top-moving-items?${qs}`
    : `${API_BASE_URL}/stock-movements/top-moving-items`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as ApiBaseResponse<TopMovingItem[]>;
}


/* ========== RESERVATIONS AVAILABILITY (VER DISPONIBILIDAD) ========== */

export type ReservationAvailabilityTable = {
  id: string;
  number: number;
  capacity: number;
  availableTimeSlots: string[]; // ["08:00", "20:00", "21:00"]
};

export type ReservationAvailabilityEnvelope = {
  tables: ReservationAvailabilityTable[];
};

export type GetReservationAvailabilityResponse =
  ApiBaseResponse<ReservationAvailabilityEnvelope>;

/**
 * Ver disponibilidad de mesas para una fecha y tamaño de grupo.
 * GET /reservations/availability/:date?partySize=4&duration=120
 */
export async function getReservationAvailability(params: {
  date: string; // "YYYY-MM-DD"
  partySize: number; // 1–20
  duration?: number; // minutos (default backend: 120)
}): Promise<GetReservationAvailabilityResponse> {
  const { date, partySize, duration } = params;

  const url = new URL(
    `${API_BASE_URL}/reservations/availability/${date}`
  );
  url.searchParams.set("partySize", String(partySize));
  if (typeof duration === "number") {
    url.searchParams.set("duration", String(duration));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
    },
  });

  return (await res.json()) as GetReservationAvailabilityResponse;
}


export type ReservationCustomerDetails = {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
};

/* ========== FINANCIAL MOVEMENTS (SUMMARY) - SOLO ADMIN ========== */



export type FinancialSummaryEnvelope = {
  success: boolean;
  message: string;
  data: FinancialSummaryData;
};



/* ========== FINANCIAL MOVEMENTS (SUMMARY) - SOLO ADMIN ========== */

export type FinancialSummaryData = {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  count: number;
};

// ✅ FIX: la API ya devuelve data directo (no "data.data")
export type GetFinancialSummaryResponse = ApiBaseResponse<FinancialSummaryData>;

export async function getFinancialSummary(params?: {
  startDate?: string; // "YYYY-MM-DD"
  endDate?: string;   // "YYYY-MM-DD"
}): Promise<GetFinancialSummaryResponse> {
  const searchParams = new URLSearchParams();

  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/financial-movements/summary?${qs}`
    : `${API_BASE_URL}/financial-movements/summary`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetFinancialSummaryResponse;
}

/* ========== FINANCIAL MOVEMENTS (LIST) - SOLO ADMIN ========== */

export type FinancialMovement = {
  id: string;
  type: string; // ej: "sale"
  amount: number;
  category: string; // ej: "ventas"
  subcategory?: string; // ej: "venta_directa"
  paymentMethod?: string; // ej: "cash"
  description?: string;
  notes?: string;

  billId?: string;
  orderId?: string;

  reference?: string;
  movementNumber?: string;

  createdAt: string;
  updatedAt?: string;

  createdBy?: string;
  updatedBy?: string;
};

export type GetFinancialMovementsResponse = ApiBaseResponse<FinancialMovement[]>;

export async function getFinancialMovements(params?: {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type?: string; // ej: "sale"
}): Promise<GetFinancialMovementsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);
  if (params?.type) searchParams.set("type", params.type);

  const qs = searchParams.toString();
  const url = qs
    ? `${API_BASE_URL}/financial-movements?${qs}`
    : `${API_BASE_URL}/financial-movements`;

  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return (await res.json()) as GetFinancialMovementsResponse;
}


/* ========== FINANCIAL MOVEMENTS (CREATE) - SOLO ADMIN ========== */

export type FinancialMovementType =
  | "sale"
  | "INVENTORY_PURCHASE"
  | "SALARY_PAYMENT"
  | "UTILITY_PAYMENT"
  | "TAX_PAYMENT"
  | "EXPENSE"
  | "CASH_WITHDRAWAL"
  | "CASH_DEPOSIT";

export type CreateFinancialMovementPayload = {
  type: FinancialMovementType;
  amount: number;
  description?: string;
  category?: string;
  subcategory?: string;
  supplierId?: string;
  employeeId?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  approvedBy?: string;
  notes?: string;
  tags?: string[];
};

export type CreateFinancialMovementResponse = ApiBaseResponse<FinancialMovement>;

export async function createFinancialMovement(
  payload: CreateFinancialMovementPayload
): Promise<CreateFinancialMovementResponse> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  if (!token) {
    throw new Error("No hay token. Iniciá sesión como administrador.");
  }

  // Limpieza: no mandamos strings vacíos ni undefined
  const cleanPayload: any = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    if (Array.isArray(v) && v.length === 0) return;
    cleanPayload[k] = v;
  });

  const res = await fetch(`${API_BASE_URL}/financial-movements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(cleanPayload),
  });

  return (await res.json()) as CreateFinancialMovementResponse;
}


export type Category = {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  sortOrder?: number | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};




export async function getCategories(): Promise<ApiBaseResponse<Category[]>> {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: "GET",
    headers: { accept: "*/*" },
    cache: "no-store",
  });

  return (await res.json()) as ApiBaseResponse<Category[]>;
}

/* ====== CREATE CATEGORY (POST /categories) – SOLO ADMIN ====== */

export type CreateCategoryPayload = {
  name: string;
  description?: string;
  imageUrl?: string;          // debe ser URL válida si se envía
  sortOrder?: number;
  parentCategoryId?: string;  // UUID si se envía
  color?: string;
  icon?: string;
};

export type CreateCategoryResponse = ApiBaseResponse<Category>;

export async function createCategory(
  payload: CreateCategoryPayload
): Promise<CreateCategoryResponse> {
  let token: string | null = null;

  if (typeof window !== "undefined") {
    token = localStorage.getItem("festgo_token");
  }

  if (!token) {
    throw new Error("No hay token. Iniciá sesión como administrador.");
  }

  // ✅ limpiamos: no mandamos strings vacíos ni undefined
  const clean: any = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    clean[k] = v;
  });

  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "*/*",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(clean),
  });

  return (await res.json()) as CreateCategoryResponse;
}
