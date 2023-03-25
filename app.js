const axios = require('axios');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');

const url = 'https://www.gazette.gov.mv/iulaan?type=vazeefaa';

async function fetchJobPostings(lastJobPostingDetailsUrl) {
    let currentPage = 1;
    const jobPostings = [];
    let foundLastJobPosting = false;

    while (foundLastJobPosting == false) {
      try {
        const pageUrl = `${url}&page=${currentPage}`;
        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);
  
        const pageJobPostings = [];
  
        $('.col-md-12.bordered.items.en, .col-md-12.bordered.items').each((_, element) => {
          const title = $(element).find('.iulaan-title').text().trim();
          const office = $(element).find('.iulaan-office').text().trim();
          const date = $(element).find('.info').eq(1).text().trim().split(':')[1].trim();
          const deadline = $(element).find('.info').eq(2).text().trim().split(' ').slice(1).join(' ').trim();
          const detailsUrl = $(element).find('.read-more').attr('href');
  
          // If we have already processed this job posting, break the loop and return the job postings
          if (detailsUrl === lastJobPostingDetailsUrl) {
            foundLastJobPosting = true;
            return false;
          }
          
          pageJobPostings.push({
            title,
            office,
            date,
            deadline,
            detailsUrl,
          });
        });
        // If there are no more job postings, break the loop
        if (pageJobPostings.length === 0) {
          break;
        }
  
        // Add the job postings from the current page to the main jobPostings array
        jobPostings.push(...pageJobPostings);
        //console.log(...pageJobPostings);
        // Increment the current page number
        currentPage += 1;
      } catch (error) {
        console.error(`Error fetching job postings on page ${currentPage}:`, error);
        break;
      }
    }
  
    return jobPostings;
}
    

/*
//get current pages job ppstings
async function fetchJobPostings() {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const jobPostings = [];

    $('.col-md-12.bordered.items.en, .col-md-12.bordered.items').each((_, element) => {
      const title = $(element).find('.iulaan-title').text().trim();
      const office = $(element).find('.iulaan-office').text().trim();
      const date = $(element).find('.info').eq(1).text().trim().split(':')[1].trim();
      const deadline = $(element).find('.info').eq(2).text().trim().split(' ').slice(1).join(' ').trim();
      const detailsUrl = $(element).find('.read-more').attr('href');

      jobPostings.push({
        title,
        office,
        date,
        deadline,
        detailsUrl,
      });
    });

    return jobPostings;
  } catch (error) {
    console.error('Error fetching job postings:', error);
    return [];
  }
}*/

/*async function fetchJobPostings() {
    let currentPage = 1;
    const jobPostings = [];
  
    while (true) {
      try {
        const pageUrl = `${url}&page=${currentPage}`;
        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);
  
        const pageJobPostings = [];
  
        $('.col-md-12.bordered.items.en, .col-md-12.bordered.items').each((_, element) => {
            const title = $(element).find('.iulaan-title').text().trim();
            const office = $(element).find('.iulaan-office').text().trim();
            const date = $(element).find('.info').eq(1).text().trim().split(':')[1].trim();
            const deadline = $(element).find('.info').eq(2).text().trim().split(' ').slice(1).join(' ').trim();
            const detailsUrl = $(element).find('.read-more').attr('href');
      
            pageJobPostings.push({
                title,
                office,
                date,
                deadline,
                detailsUrl,
            });
        });

        // If there are no more job postings, break the loop
        if (pageJobPostings.length === 0) {
            break;
        }

        // Add the job postings from the current page to the main jobPostings array
      jobPostings.push(...pageJobPostings);

      // Increment the current page number
      currentPage += 1;
    } catch (error) {
      console.error(`Error fetching job postings on page ${currentPage}:`, error);
      break;
    }
  }

  return jobPostings;
}*/
  
async function getLastAddedJobPosting() {
    const uri = "mongodb+srv://samoohmoosaj:Hgmz9TppNSxzfRqh@jobpostings.udpksm2.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  
    try {
      await client.connect();
      const db = client.db('job_postings_db');
      const collection = db.collection('job_postings');
      const lastJobPosting = await collection.find().sort({ _id: -1 }).limit(1).next();
      //console.log(lastJobPosting);
      return lastJobPosting;
    } catch (error) {
      console.error('Error fetching the last added job posting:', error);
      return null;
    } finally {
      await client.close();
    }
}
  
  
  

async function saveToMongoDB(jobPostings) {
    const uri = 'mongodb+srv://samoohmoosaj:Hgmz9TppNSxzfRqh@jobpostings.udpksm2.mongodb.net/?retryWrites=true&w=majority';
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  
    try {
      await client.connect();
      const collection = client.db('job_postings_db').collection('job_postings');
  
      for (let i = jobPostings.length - 1; i >= 0; i--) {
        const jobPosting = jobPostings[i];
        await collection.insertOne(jobPosting);
      }
  
      console.log(`Successfully inserted ${jobPostings.length} job postings.`);
    } catch (error) {
      console.error('Error saving job postings to MongoDB:', error);
    } finally {
      await client.close();
    }
  }

/*async function main() {
  const jobPostings = await fetchJobPostings();
  console.log(JSON.stringify(jobPostings, null, 2));
}*/

async function main() {
    const lastJobPosting = await getLastAddedJobPosting();
    const lastJobPostingDetailsUrl = lastJobPosting ? lastJobPosting.detailsUrl : null;
    let jobPostings;
    if (lastJobPostingDetailsUrl) {
      // Fetch only the new job postings
      jobPostings = await fetchJobPostings(lastJobPostingDetailsUrl);
    } else {
      // Fetch all job postings from the beginning
      jobPostings = await fetchJobPostings(null);
    }
  
    await saveToMongoDB(jobPostings);
  }  

async function addJobPosting(jobPosting) {
    const uri = "mongodb+srv://samoohmoosaj:Hgmz9TppNSxzfRqh@jobpostings.udpksm2.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  
    try {
      await client.connect();
      const db = client.db('job_postings_db');
      const collection = db.collection('job_postings');
      const result = await collection.insertOne(jobPosting);
      console.log(`Job posting ${result.insertedId} added to database`);
      return result.insertedId;
    } catch (error) {
      console.error('Error adding job posting:', error);
      return null;
    } finally {
      await client.close();
    }
  }

  
  const jobPosting = {
    title: 'Assistant Cook',
    office: 'Maldives Industrial Fisheries Company Limited',
    date: '21 March 2023',
    deadline: '26 March 2023 14:00',
    detailsUrl: 'https://www.gazette.gov.mv/iulaan/233931',
  };

  main();
  //addJobPosting(jobPosting);
  