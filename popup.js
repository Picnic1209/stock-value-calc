const stockGrant = 2900
const CRORE = 10000000
globalConversionRate = null

import {CURRENCY_CONVERSION_API_KEY} from "./config.js"

const RUBRIK_STOCK_EXCHANGE = 'XNYS'
const RUBRIK_STOCK_SYMBOL = 'RBRK'
const proxyUrl = 'https://cloudflare-cors-anywhere.parag-cors-proxy.workers.dev/?';

// Gets USD to INR rate is the value is more stale than 1 hour
async function getConversionRate() {
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const lastFetchedTime = localStorage.getItem('lastFetchedTime');
    const cachedRate = localStorage.getItem('globalConversionRate');

    // Check if data is available and if it was fetched within the last hour
    if (lastFetchedTime && cachedRate && (Date.now() - lastFetchedTime < oneHour)) {
        console.log("Using cached conversion rate");
        globalConversionRate = parseFloat(cachedRate); // Retrieve from localStorage and parse to a number
        return globalConversionRate;
    }

    // Otherwise, fetch new data from API
    try {

        // Fetch USD to INR rate
        // Using RAPID API 
        // Free tier - 1000 requests/month
        const currencyConversionUrl = 'https://currency-conversion-and-exchange-rates.p.rapidapi.com/convert?from=USD&to=INR&amount=1';
        const currencyConversionOptions = {
            method: 'GET',
            headers: {
                'x-rapidapi-key': CURRENCY_CONVERSION_API_KEY,
                'x-rapidapi-host': 'currency-conversion-and-exchange-rates.p.rapidapi.com'
            }
        };
        const response = await fetch(currencyConversionUrl, currencyConversionOptions);
        const result = await response.json();
        console.log(result);
        
        let conversionRate = result.result;
        globalConversionRate = conversionRate;
        
        // Save to localStorage
        localStorage.setItem('globalConversionRate', conversionRate);
        localStorage.setItem('lastFetchedTime', Date.now().toString());
        
        return conversionRate;
    } catch (error) {
        console.error("Error fetching conversion rate:", error);
        return null;
    }
}

// Gets Rubrik's Stock price in USD
// Uses rubrik's website, so no limit on API hits
async function getRubrikStockPriceInUSD() {

    // Rubrik Stock Price Endpoint from rubrik website
    const rubrikStockUrl = `https://ir.rubrik.com/feed/StockQuote.svc/GetFullStockQuoteList?exchange=${RUBRIK_STOCK_EXCHANGE}&symbol=${RUBRIK_STOCK_SYMBOL}`
    const rubrikStockOptions = {
        method: 'GET',
    };

    const response = await fetch(rubrikStockUrl, rubrikStockOptions);
    const result = await response.json();
    console.log(result);
    let stockPrice = result.GetFullStockQuoteListResult[0].TradePrice;

    return stockPrice;

}

// Fetches rubrik price from google search
// No rate limit here + updated price
async function getRubrikStockPriceInUSDFromGoogle() {
    console.log("Inside get function")
    // Rubrik Stock Price Endpoint from rubrik website
    const rubrikStockUrl = 'https://www.google.com/async/finance_wholepage_price_updates?async=mids%3A%2Fg%2F11vwykrj9t%2Ccurrencies%3A%2C_fmt%3Ajspb'
    const rubrikStockOptions = {
        method: 'GET',
        headers: {
            'priority': 'u=1, i',
          }
    };

    const response = await fetch(proxyUrl + rubrikStockUrl, rubrikStockOptions);
    console.log('Status:', response.status); // Check the status code
    const responseString = await response.text();
    console.log(responseString);
    // Use string matching to extract a specific value, if needed
    const match = responseString.match(/"RBRK","([^,]+),([^,]+),([^,]+)/);
    if (match && match[2]) {
        const extractedValue = match[2];
        console.log("Extracted Value:", extractedValue);
        return parseFloat(extractedValue);
    } else {
        console.log("Value not found from API!");
        return null
    }

    

}

// Get's the input, calculates stock price estimate and populates the estimated price
function handleSubmit() {
    const estimateStockPriceElement = document.getElementById('estimateStockPrice')
    if (globalConversionRate==null) {
        estimateStockPriceElement.innerHTML = `Wait for Conversion Rate to load and try again.`
        return;
    }

    let numberInput = document.getElementById("numberInput").value;
    const finalValRequired = parseFloat(numberInput)*CRORE
    console.log(globalConversionRate)
    console.log(finalValRequired)

    const pricePerStockInINR = finalValRequired/stockGrant
    console.log(pricePerStockInINR)

    const estimateStockPriceRequiredInUSD = pricePerStockInINR/globalConversionRate
    console.log(estimateStockPriceRequiredInUSD)

    
    estimateStockPriceElement.innerHTML = `Required Stock Price: $${estimateStockPriceRequiredInUSD.toFixed(3)} `
}


document.addEventListener('DOMContentLoaded', async () => {

    
    const submitButton = document.getElementById("submitButton");
    const numberForm = document.getElementById("numberForm");

    // Function to handle form submission

    

    // Trigger when "Submit" button is clicked
    submitButton.addEventListener("click", handleSubmit);

    // Trigger when "Enter" key is pressed inside the form
    numberForm.addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent default form submission
        handleSubmit();
    });


    try {

        let stockPrice = await getRubrikStockPriceInUSDFromGoogle();
        console.log("Current Stock Price: " + stockPrice);
        if(stockPrice == null){
            console.log("Error fetching rubrik stock price")
            return
        }
        
        // update stock price
        const stockPriceElement = document.getElementById('RubrikStockPrice')
        stockPriceElement.innerHTML = `$ ${stockPrice}`

        // Fetch US stock price
        try {
            let conversionRate = await getConversionRate();

            // Update Conversion rate
            const USDtoINRRateElement = document.getElementById('USDtoINRRate')
            USDtoINRRateElement.innerHTML = `$ 1 = &#8377; ${conversionRate.toFixed(2)}`

            // Update Total worth
            console.log("Total stock worth: ")
            let exactVal = conversionRate * stockPrice * stockGrant
            let val = Math.floor(exactVal)
            const formatter = new Intl.NumberFormat('en-IN');
            const formattedNumber = formatter.format(val);               
            console.log(formattedNumber)

            const WorthInINRElement = document.getElementById('WorthInINR')
            WorthInINRElement.innerHTML = `&#8377; ${formattedNumber}`

            // Update Per year Total Worth
            const WorthPerYearElement = document.getElementById('WorthPerYear')
            WorthPerYearElement.innerHTML = `&#8377; ${formatter.format(Math.floor(exactVal/4))} `

            // Update Post Tax value
            const WorthPerYearPostTaxElement = document.getElementById('WorthPerYearPostTax')
            WorthPerYearPostTaxElement.innerHTML = `&#8377; ${formatter.format(Math.floor(exactVal*0.7/4))} `

        } catch (error) {
            console.error("Error fetching US to INR conversion price!");
            console.error(error);
        }
    } catch (error) {
        console.error("Error fetching Rubrik stock price!");
        console.error(error);
    }

})

document.addEventListener("DOMContentLoaded", function() {
    
});

function yourFunction(value) {
    // Placeholder function - define the logic here
    console.log("Number entered:", value);
}


