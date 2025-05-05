const stockGrant = 2900
const CRORE = 10000000

const taxPercentage = getSavedTaxPercentage();
const multiplyForTaxDeduction = 1 - taxPercentage // 35.88% bruh

let globalConversionRate = null

import {CURRENCY_CONVERSION_API_KEY} from "./config.js"

const RUBRIK_STOCK_EXCHANGE = 'XNYS'
const RUBRIK_STOCK_SYMBOL = 'RBRK'
const proxyUrl = 'https://cloudflare-cors-anywhere.parag-cors-proxy.workers.dev/?';

const CURRENT_PRICE_KEY = 'current_price'
const AFTER_MARKET_PRICE_KEY = 'after_market_key'

function getSavedTaxPercentage() {
    const storedTax = localStorage.getItem('taxPercentage');
    return storedTax !== null ? parseFloat(storedTax) : 0.3588; // default = 35.88%
}

function saveTaxPercentage(newTax) {
    localStorage.setItem('taxPercentage', newTax);
    location.reload(); // Reload to apply new tax value across calculations
}

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
        
        // Change API function to fetch from different endpoints
        let conversionRate = await getUSDToINRCurrencyAPI();
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

// Fetch USD To INR currency-conversion-and-exchange-rates
async function getUSDToINRCurrencyCAEAPI() {
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
        
        return result.result;
}

// Fetch USD To INR currencyAPI
async function getUSDToINRCurrencyAPI() {
    // Fetch USD to INR rate
    // Using RAPID API 
    // Free tier - 1250 requests/month

    const currencyConversionUrl = 'https://currencyapi-net.p.rapidapi.com/rates?output=JSON&base=USD';
    const currencyConversionOptions = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': CURRENCY_CONVERSION_API_KEY,
        }
    };
    const response = await fetch(currencyConversionUrl, currencyConversionOptions);
    const result = await response.json();
    console.log(result);

    let conversionRate = result['rates']['INR']
    return conversionRate
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
    console.log(responseString);    // Something like )]}'{"PriceUpdate":[[[[0,"/g/11vwykrj9t",null,"NYSE",null,null,null,"USD",null,null,null,null,null,null,null,["66.51","+12.85","23.95%",2,"6 Dec, 7:32 am GMT-5",1,null,null,null,null,null,null,[1733488354]],null,[["/g/11vwykrj9t"],"Rubrik Inc","RBRK","53.66",53.66,"+1.04","1.98%",2,"5 Dec, 4:00 pm GMT-5","/search?sca_esv\u003d360d606574466e04\u0026q\u003dNYSE:+RBRK\u0026stick\u003dH4sIAAAAAAAAAONgecRowS3w8sc9YSn9SWtOXmPU5OIKzsgvd80rySypFJLmYoOyBKX4uXj10_UNDcvKK7OLsixLeBaxcvlFBrtaKQQ5BXkDAMJ_PnZKAAAA","4:00 pm GMT-5",10,[1733432403]],null,[52.62,2]],null,["/g/11vwykrj9t"]]]]}
    
    // Step 1: Remove the extraneous characters at the start
    const cleanedResponse = responseString.replace(")]}'", "");

    // Step 2: Parse the cleaned response as JSON
    let parsedData = JSON.parse(cleanedResponse);
    const afterMarketValue = parsedData?.PriceUpdate?.[0]?.[0]?.[0]?.[15]?.[0] ?? null;
    console.log("aftermarketValue: " + JSON.stringify(afterMarketValue, null, 2))

    let val = {}
    if(afterMarketValue){
        val[AFTER_MARKET_PRICE_KEY] = parseFloat(afterMarketValue)
    }

    const currentValue = parsedData?.PriceUpdate?.[0]?.[0]?.[0]?.[17]?.[3] ?? null;
    console.log("CurrentValue: " + JSON.stringify(currentValue, null, 2))

    if(currentValue){
        const normalizedValue = currentValue.replace(',', '.');
        val[CURRENT_PRICE_KEY] = parseFloat(normalizedValue)
    }
    return val
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

        let stockPriceResponse = await getRubrikStockPriceInUSDFromGoogle();
        let stockPrice = stockPriceResponse[CURRENT_PRICE_KEY]

        console.log("Current Stock Price: " + stockPrice);
        if(stockPrice == null){
            console.log("Error fetching rubrik stock price")
            return
        }
        
        // update stock price
        const stockPriceElement = document.getElementById('RubrikStockPrice')
        stockPriceElement.innerHTML = `$ ${stockPrice}`

        // update after market price
        let afterMarketStockPrice = stockPriceResponse[AFTER_MARKET_PRICE_KEY]

        const afterMarketStockPriceElement = document.getElementById('RubrikStockPriceCollapsible')
        if (afterMarketStockPrice) {
            afterMarketStockPriceElement.innerHTML = `$ ${afterMarketStockPrice}`
        } else{
            afterMarketStockPriceElement.innerHTML = `Currently Markets are Open!`
        }
        

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
            WorthPerYearPostTaxElement.innerHTML = `&#8377; ${formatter.format(Math.floor(exactVal*multiplyForTaxDeduction/4))} `



            // Update all the fields in After Market price
            
            if(afterMarketStockPrice){
                // Update Total worth
                console.log("Total stock worth: ")
                let exactValAfterMarket = conversionRate * afterMarketStockPrice * stockGrant
                let afterMarketVal = Math.floor(exactValAfterMarket)
                const afterMarketFormattedNumber = formatter.format(afterMarketVal);               
                console.log(afterMarketFormattedNumber)

                const AfterMarketWorthInINRElement = document.getElementById('WorthInINRCollapsible')
                AfterMarketWorthInINRElement.innerHTML = `&#8377; ${afterMarketFormattedNumber}`

                // Update Per year Total Worth
                const AFterMarketWorthPerYearElement = document.getElementById('WorthPerYearCollapsible')
                AFterMarketWorthPerYearElement.innerHTML = `&#8377; ${formatter.format(Math.floor(exactValAfterMarket/4))} `

                // Update Post Tax value
                const AfterMarketWorthPerYearPostTaxElement = document.getElementById('WorthPerYearPostTaxCollapsible')
                AfterMarketWorthPerYearPostTaxElement.innerHTML = `&#8377; ${formatter.format(Math.floor(exactValAfterMarket*multiplyForTaxDeduction/4))} `
            }


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
    const taxInput = document.getElementById('taxPercentageInput');
    const saveButton = document.getElementById('saveTaxButton');

    // Pre-fill the input with current value
    taxInput.value = taxPercentage;

    saveButton.addEventListener('click', () => {
        const newTax = parseFloat(taxInput.value);
        if (!isNaN(newTax) && newTax >= 0 && newTax <= 1) {
            saveTaxPercentage(newTax);
        } else {
            alert("Please enter a valid value between 0 and 1");
        }
    });
    
});

