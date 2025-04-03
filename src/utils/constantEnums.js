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
  mediaType
};
