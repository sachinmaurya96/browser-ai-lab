/**
 * A small library of famous quotes for quote cards. Only quotes whose wording
 * and attribution are well documented are listed (commonly misattributed
 * lines are left out on purpose); `source` says where each comes from.
 * Translations use the widely published English wording.
 */
export interface FamousQuote {
  text: string;
  author: string;
  source: string;
  category: QuoteCategory;
}

export type QuoteCategory =
  | "Wisdom"
  | "Courage"
  | "Science"
  | "Technology"
  | "Design"
  | "India"
  | "Literature";

export const QUOTE_CATEGORIES: readonly QuoteCategory[] = [
  "Wisdom",
  "Courage",
  "Science",
  "Technology",
  "Design",
  "India",
  "Literature",
];

const Q = (category: QuoteCategory, text: string, author: string, source = ""): FamousQuote => ({
  text,
  author,
  source,
  category,
});

export const FAMOUS_QUOTES: readonly FamousQuote[] = [
  // Wisdom
  Q("Wisdom", "The unexamined life is not worth living.", "Socrates", "Plato, Apology"),
  Q("Wisdom", "I think, therefore I am.", "René Descartes", "Discourse on the Method, 1637"),
  Q("Wisdom", "The journey of a thousand miles begins with a single step.", "Lao Tzu", "Tao Te Ching"),
  Q("Wisdom", "Knowing is not enough; we must apply. Willing is not enough; we must do.", "Johann Wolfgang von Goethe", "Wilhelm Meister’s Journeyman Years"),
  Q("Wisdom", "Well done is better than well said.", "Benjamin Franklin", "Poor Richard’s Almanack, 1737"),
  Q("Wisdom", "Hope is the thing with feathers that perches in the soul.", "Emily Dickinson", "Poem 314"),

  // Courage
  Q("Courage", "The only thing we have to fear is fear itself.", "Franklin D. Roosevelt", "First inaugural address, 1933"),
  Q("Courage", "Ask not what your country can do for you — ask what you can do for your country.", "John F. Kennedy", "Inaugural address, 1961"),
  Q("Courage", "Darkness cannot drive out darkness; only light can do that. Hate cannot drive out hate; only love can do that.", "Martin Luther King Jr.", "Strength to Love, 1963"),
  Q("Courage", "Injustice anywhere is a threat to justice everywhere.", "Martin Luther King Jr.", "Letter from Birmingham Jail, 1963"),
  Q("Courage", "Education is the most powerful weapon which you can use to change the world.", "Nelson Mandela", "Speech in Johannesburg, 2003"),
  Q("Courage", "Never give in, never give in, never, never, never, never.", "Winston Churchill", "Harrow School, 1941"),

  // Science
  Q("Science", "Imagination is more important than knowledge.", "Albert Einstein", "The Saturday Evening Post, 1929"),
  Q("Science", "If I have seen further it is by standing on the shoulders of Giants.", "Isaac Newton", "Letter to Robert Hooke, 1675"),
  Q("Science", "That’s one small step for man, one giant leap for mankind.", "Neil Armstrong", "Apollo 11, 1969"),
  Q("Science", "We can only see a short distance ahead, but we can see plenty there that needs to be done.", "Alan Turing", "Computing Machinery and Intelligence, 1950"),
  Q("Science", "The good thing about science is that it’s true whether or not you believe in it.", "Neil deGrasse Tyson", "Real Time with Bill Maher, 2011"),
  Q("Science", "The purpose of computing is insight, not numbers.", "Richard Hamming", "Numerical Methods for Scientists and Engineers, 1962"),

  // Technology
  Q("Technology", "The best way to predict the future is to invent it.", "Alan Kay", "1971"),
  Q("Technology", "Talk is cheap. Show me the code.", "Linus Torvalds", "Linux kernel mailing list, 2000"),
  Q("Technology", "Programs must be written for people to read, and only incidentally for machines to execute.", "Harold Abelson", "Structure and Interpretation of Computer Programs"),
  Q("Technology", "Premature optimization is the root of all evil.", "Donald Knuth", "Structured Programming with go to Statements, 1974"),
  Q("Technology", "Any sufficiently advanced technology is indistinguishable from magic.", "Arthur C. Clarke", "Profiles of the Future"),
  Q("Technology", "Your time is limited, so don’t waste it living someone else’s life.", "Steve Jobs", "Stanford commencement address, 2005"),
  Q("Technology", "The only way to do great work is to love what you do.", "Steve Jobs", "Stanford commencement address, 2005"),

  // Design
  Q("Design", "Design is not just what it looks like and feels like. Design is how it works.", "Steve Jobs", "The New York Times, 2003"),
  Q("Design", "Good design is as little design as possible.", "Dieter Rams", "Ten principles for good design"),
  Q("Design", "Less is more.", "Ludwig Mies van der Rohe"),
  Q("Design", "Form ever follows function.", "Louis Sullivan", "The Tall Office Building Artistically Considered, 1896"),

  // India
  Q("India", "Arise, awake, and stop not till the goal is reached.", "Swami Vivekananda"),
  Q("India", "Strength does not come from physical capacity. It comes from an indomitable will.", "Mahatma Gandhi", "Young India, 1920"),
  Q("India", "Where the mind is without fear and the head is held high.", "Rabindranath Tagore", "Gitanjali"),
  Q("India", "You have a right to your actions, but never to the fruits of your actions.", "Bhagavad Gita", "Chapter 2, verse 47"),
  Q("India", "Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.", "A. P. J. Abdul Kalam"),

  // Literature
  Q("Literature", "To be, or not to be, that is the question.", "William Shakespeare", "Hamlet"),
  Q("Literature", "Not all those who wander are lost.", "J. R. R. Tolkien", "The Fellowship of the Ring"),
  Q("Literature", "It was the best of times, it was the worst of times.", "Charles Dickens", "A Tale of Two Cities"),
  Q("Literature", "All happy families are alike; each unhappy family is unhappy in its own way.", "Leo Tolstoy", "Anna Karenina"),
  Q("Literature", "So we beat on, boats against the current, borne back ceaselessly into the past.", "F. Scott Fitzgerald", "The Great Gatsby"),
  Q("Literature", "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", "Jane Austen", "Pride and Prejudice"),
];
