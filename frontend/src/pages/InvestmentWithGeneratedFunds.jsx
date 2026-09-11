import Investment from './Investment'
import InvestorGeneratedFunds from './InvestorGeneratedFunds'

export default function InvestmentWithGeneratedFunds(){
  return <>
    <div className="investment-generated-top"><InvestorGeneratedFunds /></div>
    <Investment />
  </>
}
