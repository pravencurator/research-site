// yahoo-finance2 v3 requires instantiation: new YahooFinance()
// This module creates one shared instance for the entire app.
import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new YahooFinanceClass();
export default yahooFinance;
