import { useEffect, useState } from "react";
import { Eye, Check, X, Printer, Ban } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { BACKEND_URL } from "../../config/constant";

export default function Lowerbhome() {
  const [selected, setSelected] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const shopId = localStorage.getItem("shopId");
        const response = await fetch(`${BACKEND_URL}/shop/orders`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shopId }),
        });
        
        if (response.ok) {
          const data = await response.json();
          // Transform the data to group products by order
          const transformedOrders = data.message?.reduce((acc, order) => {
            const existingOrder = acc.find(o => o.id === order.id);
            if (existingOrder) {
              existingOrder.product.push({
                id: order.product.id,
                name: order.product.name,
                price: order.product.price,
                image: order.product.image,
                quantity: order.quantity
              });
            } else {
              acc.push({
                id: order.id,
                consumer: order.consumer,
                product: [{
                  id: order.product.id,
                  name: order.product.name,
                  price: order.product.price,
                  image: order.product.image,
                  quantity: order.quantity
                }],
                status: order.status,
                createdAt: order.createdAt
              });
            }
            return acc;
          }, []) || [];
          
          setOrders(transformedOrders);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Calculate time ago
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffInMinutes = Math.floor((now - orderTime) / (1000 * 60));
    return `${diffInMinutes} min ago`;
  };

  // Filter orders based on selected tab
  const getFilteredOrders = () => {
    switch (selected) {
      case "orders":
        return orders.filter(order => order.status === "PENDING");
      case "accepted":
        return orders.filter(order => order.status === "CONFIRMED");
      case "history":
        return orders.filter(order => order.status === "CANCELLED" || billingData.some(bill => bill.orderId === order.id));
      default:
        return [];
    }
  };

  // Handle order status change
  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`${BACKEND_URL}/shop/orders/update-status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId, status }),
      });
      
      if (response.ok) {
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId ? { ...order, status } : order
          )
        );
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      // Fallback to local state update
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    }
  };

  // Handle print bill - Updated version
  const handlePrintBill = (order) => {
    const billData = {
      orderId: order.id,
      customerName: order.consumer.name,
      customerUsername: order.consumer.username, // Added username
      items: order.product.map(p => ({
        name: p.name,
        price: p.price,
        quantity: p.quantity,
        image: p.image, // Ensure image is included
        total: p.price * p.quantity
      })),
      totalAmount: order.product.reduce((sum, p) => sum + (p.price * p.quantity), 0),
      timestamp: new Date().toISOString()
    };
    
    setBillingData(prev => [...prev, billData]);
    
    // Move to history after billing
    updateOrderStatus(order.id, "COMPLETED");
    navigate("/billing", { state: { billData } });
  };

  const tabClass = (tab) =>
    `cursor-pointer px-3 sm:px-6 py-3 transition-all font-medium text-sm sm:text-base ${
      selected === tab
        ? "border-b-4 border-yellow-500 text-yellow-600 font-semibold"
        : "text-gray-600 hover:text-yellow-500"
    }`;

  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-yellow-600 font-semibold text-sm">
              {order.consumer.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-800 truncate">{order.consumer.name}</h3>
            <p className="text-sm text-gray-500">{getTimeAgo(order.createdAt)}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2">
          <button
            onClick={() => setViewingOrder(viewingOrder === order.id ? null : order.id)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-1 flex-1 sm:flex-none justify-center"
          >
            <Eye size={14} className="sm:w-4 sm:h-4" />
            <span>View</span>
          </button>
          
          {selected === "orders" && (
            <>
              <button
                onClick={() => updateOrderStatus(order.id, "CONFIRMED")}
                className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-1 flex-1 sm:flex-none justify-center"
              >
                <Check size={14} className="sm:w-4 sm:h-4" />
                <span>Accept</span>
              </button>
              <button
                onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-1 flex-1 sm:flex-none justify-center"
              >
                <X size={14} className="sm:w-4 sm:h-4" />
                <span>Reject</span>
              </button>
            </>
          )}
          
          {selected === "accepted" && (
            <>
              <button
                onClick={() => handlePrintBill(order)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-1 flex-1 sm:flex-none justify-center"
              >
                <Printer size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Print Bill</span>
                <span className="xs:hidden">Print</span>
              </button>
              <button
                onClick={() => updateOrderStatus(order.id, "CANCELLED")}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium flex items-center space-x-1 flex-1 sm:flex-none justify-center"
              >
                <Ban size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Cancel Order</span>
                <span className="xs:hidden">Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {viewingOrder === order.id && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-800 mb-3 text-sm sm:text-base">Order Details:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {order.product.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-6 h-6 sm:w-8 sm:h-8 object-cover rounded"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNiA4QzEyLjY4NjMgOCAxMCAxMC42ODYzIDEwIDE0VjE4QzEwIDIxLjMxMzcgMTIuNjg2MyAyNCAxNiAyNEMxOS4zMTM3IDI0IDIyIDIxLjMxMzcgMjIgMThWMTRDMjIgMTAuNjg2MyAxOS4zMTM3IDggMTYgOFoiIGZpbGw9IiM5Q0E5QjQiLz4KPC9zdmc+";
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{item.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Quantity: {item.quantity}</p>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">₹{item.price}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-right">
            <p className="text-base sm:text-lg font-semibold text-gray-800">
              Total: ₹{order.product.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen mt-2 sm:mt-5 rounded-t-2xl sm:rounded-4xl bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          <div className="flex justify-center space-x-2 sm:space-x-8 border-b overflow-x-auto">
            <div onClick={() => setSelected("orders")} className={tabClass("orders")}>
              Orders
            </div>
            <div onClick={() => setSelected("accepted")} className={tabClass("accepted")}>
              <span className="hidden sm:inline">Accepted Orders</span>
              <span className="sm:hidden">Accepted</span>
            </div>
            <div onClick={() => setSelected("history")} className={tabClass("history")}>
              History
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin w-6 h-6 sm:w-8 sm:h-8 border-4 border-yellow-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm sm:text-base">Loading orders...</p>
          </div>
        ) : getFilteredOrders().length > 0 ? (
          <div>
            {getFilteredOrders().map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Eye className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">No orders found</h3>
            <p className="text-gray-500 text-sm sm:text-base px-4">
              {selected === "orders" && "No pending orders at the moment."}
              {selected === "accepted" && "No accepted orders to show."}
              {selected === "history" && "No order history available."}
            </p>
          </div>
        )}
      </div>

      {/* Debug: Show billing data */}
      {billingData.length > 0 && (
        <div className="fixed bottom-4 right-2 sm:right-4 bg-blue-500 text-white p-2 sm:p-4 rounded-lg shadow-lg">
          <p className="text-xs sm:text-sm font-medium">Bills Generated: {billingData.length}</p>
        </div>
      )}
    </div>
  );
}