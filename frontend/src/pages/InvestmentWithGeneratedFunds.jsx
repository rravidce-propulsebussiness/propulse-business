import Investment from './Investment'
import InvestorGeneratedFunds from './InvestorGeneratedFunds'

export default function InvestmentWithGeneratedFunds(){
  return <>
    <Investment />
    <div className="investment-generated-overlay-anchor"><InvestorGeneratedFunds /></div>
  </>
}
