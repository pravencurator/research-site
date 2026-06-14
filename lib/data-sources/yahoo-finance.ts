// yahoo-finance2 v3 requires instantiation: new YahooFinance()
// This module creates one shared instance for the entire app.
import YahooFinanceClass from "yahoo-finance2";

// suppressNotices: suppress the survey prompt that pollutes server logs
const yahooFinance = new YahooFinanceClass({ suppressNotices: ["yahooSurvey"] });
export default yahooFinance;
