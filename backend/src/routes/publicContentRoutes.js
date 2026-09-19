const express=require('express');
const router=express.Router();

const faqs=[
 {id:'faq-1',question:'What is Propulse?',answer:'Propulse is a lead marketplace where businesses can discover relevant project enquiries, review lead details and purchase access to customer contact information.',is_active:true},
 {id:'faq-2',question:'Who can buy leads?',answer:'Businesses looking for new project enquiries can create an account, add wallet funds when needed and purchase eligible leads from the marketplace.',is_active:true},
 {id:'faq-3',question:'Are customer contact details visible before purchase?',answer:'No. Contact information is protected in the marketplace. Eligible buyers get access according to the lead purchase and entitlement rules.',is_active:true},
 {id:'faq-4',question:'Can I search leads by location?',answer:'Yes. The marketplace supports location-based discovery along with industry, service and other lead fields.',is_active:true},
 {id:'faq-5',question:'How does lead pricing work?',answer:'Pricing is configured by Propulse and can vary by lead, share package and eligible membership pricing. The exact price is shown before purchase.',is_active:true}
];

const pricing=[
 {category:'Marketing',name:'Marketing & Technology',tagline:'Websites, apps, marketing & creative.',description:'Websites, web apps, mobile apps, SEO, social media, performance marketing, branding, photography and video.',price_label:'Custom quote',billing_note:'Scope-based pricing',features:['Website & web app development','Mobile app development','SEO, social media & performance marketing','Branding, photography & video'],cta_label:'Talk to Marketing',cta_url:'/contact',highlighted:false,image_url:'/homepage/default-marketing.svg',is_active:true},
 {category:'Lead Sales',name:'Lead Marketplace',tagline:'Buy leads. Reach real opportunities.',description:'Discover relevant customer enquiries by service and location, review the opportunity and buy eligible access.',price_label:'Pay per lead',billing_note:'Exact price shown before purchase',features:['Location-based lead discovery','Protected customer contact data','Configured lead pricing','Purchased-lead management'],cta_label:'Explore Leads',cta_url:'/leads',highlighted:true,image_url:'/homepage/default-hero.svg',is_active:true},
 {category:'Government Compliance',name:'Business & Tax Compliance',tagline:'Registration, GST, ITR & filing support.',description:'Support for company registration, GST workflows, ITR preparation and filing, documentation and selected statutory compliance workflows.',price_label:'Custom quote',billing_note:'Scope and authority dependent',features:['Company / business registration support','GST registration & workflow support','ITR preparation & filing support','Statutory document coordination'],cta_label:'Talk to Compliance',cta_url:'/contact',highlighted:false,image_url:'/homepage/default-compliance.svg',is_active:true}
];

router.get('/homepage-media',(req,res)=>res.json({hero_image_url:'',category_images:{}}));
router.get('/service-pricing',(req,res)=>res.json(pricing));
router.get('/contact',(req,res)=>res.json({company_name:'Propulse Business Technologies Private Limited',email:'',phone:'',whatsapp:'',business_hours:'',address:'',maps_url:'',social_handles:[]}));
router.get('/faqs',(req,res)=>res.json(faqs));
router.get('/upcoming-features',(req,res)=>res.json([]));

module.exports=router;
