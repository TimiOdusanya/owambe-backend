const userGender = {
  MALE: "male",
  FEMALE: "female",
  OTHERS: "others",
};
const eventStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  ONGOING: "ongoing",
};
const foodCategory = {
  APPETIZER: "appetizer",
  MAIN: "main_course",
  DESSERT: "dessert",
  SNACK: "snack",
  OTHERS: "others",
};

const eventTableType = {
  VIP: "VIP",
  Regular: "Regular",
  Reserved: "Reserved",
  Others: "Others",
};

const drinkType = {
  WATER: "water",
  BEVERAGE: "beverage",
  WINE: "wine",
  COCKTAIL: "cocktail",
  JUICE: "juice",
  SODA: "soda",
  OTHERS: "others",
  LIQUOR: "liquor",
};


const drinkCategory = {
  ALCOHOLIC: "alcoholic",
  NONALCHOLIC: "non-alcoholic",
};


const guestRole = {
  VIP: "VIP",
  Regular: "Regular",
  Others: "Others",
}

const orderStatus = {
  Completed: "completed",
  Ongoing: "ongoing",
  Cancelled: "cancelled"
};

const menuType = {
  Food: "food",
  Drink: "drink",
};


const mediaType = {
  Photo: "photo",
  Video: "video",
};

const transactionType = {
  PAYMENT_IN: "payment_in",
  TRANSFER_OUT: "transfer_out",
  ADJUSTMENT: "adjustment",
};

const paymentPurpose = {
  MEDIA: "media",
  WISHLIST: "wishlist",
  GIFT: "gift",
  TOPUP: "topup", // Organizer self-funding event wallet (not a guest gift)
};

const paymentMethod = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  PAYMENT_LINK: "payment_link", // Flutterwave Standard: user pays on Flutterwave's page
};

const paymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
};

const giftType = {
  WISHLIST: "wishlist",
  CASHGIFT: "cashgift",
};

module.exports = {
  userGender,
  eventStatus,
  eventTableType,
  foodCategory,
  drinkCategory,
  drinkType,
  guestRole,
  orderStatus,
  menuType,
  mediaType,
  transactionType,
  paymentPurpose,
  paymentMethod,
  paymentStatus,
  giftType,
};
