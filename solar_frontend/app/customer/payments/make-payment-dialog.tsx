"use client"

import { useState } from "react"
import { CreditCard, DollarSign, Calendar } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/components/auth-provider"
import { paymentApi } from "@/lib/api"
import { format } from "date-fns"

interface Payment {
  id: number;
  installationId: number;
  paymentPlanId: number;
  amount: number;
  dueDate: string;
  status: string;
}

interface MakePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  onSuccess: () => void;
}

export default function MakePaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess
}: MakePaymentDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [amount, setAmount] = useState<string>(payment?.amount?.toString() || "")
  const [paymentMethod, setPaymentMethod] = useState<string>("creditCard")
  const [cardNumber, setCardNumber] = useState<string>("")
  const [cardExpiry, setCardExpiry] = useState<string>("")
  const [cardCvc, setCardCvc] = useState<string>("")
  const [cardName, setCardName] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [savePaymentMethod, setSavePaymentMethod] = useState<boolean>(false)
  
  // Format card number with spaces after every 4 digits
  const formatCardNumber = (value: string) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
  }
  
  // Format expiry date as MM/YY
  const formatExpiryDate = (value: string) => {
    value = value.replace(/\D/g, '')
    if (value.length > 2) {
      return value.slice(0, 2) + '/' + value.slice(2, 4)
    }
    return value
  }
  
  // Format currency for display
  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number') return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      return dateString
    }
  }
  
  // Handle card number input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 16) {
      setCardNumber(formatCardNumber(value))
    }
  }
  
  // Handle expiry date input
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\//g, '')
    if (value.length <= 4) {
      setCardExpiry(formatExpiryDate(value))
    }
  }
  
  // Handle CVC input
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    if (value.length <= 4) {
      setCardCvc(value)
    }
  }
  
  // Reset the form
  const resetForm = () => {
    setAmount(payment?.amount?.toString() || "")
    setPaymentMethod("creditCard")
    setCardNumber("")
    setCardExpiry("")
    setCardCvc("")
    setCardName("")
    setSavePaymentMethod(false)
    setIsProcessing(false)
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Please enter a valid payment amount.",
      })
      return
    }
    
    if (paymentMethod === "creditCard") {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        toast({
          variant: "destructive",
          title: "Invalid card number",
          description: "Please enter a valid 16-digit card number.",
        })
        return
      }
      
      if (!cardExpiry || cardExpiry.length < 5) {
        toast({
          variant: "destructive",
          title: "Invalid expiry date",
          description: "Please enter a valid expiry date (MM/YY).",
        })
        return
      }
      
      if (!cardCvc || cardCvc.length < 3) {
        toast({
          variant: "destructive",
          title: "Invalid CVC",
          description: "Please enter a valid security code.",
        })
        return
      }
      
      if (!cardName) {
        toast({
          variant: "destructive",
          title: "Cardholder name required",
          description: "Please enter the name on the card.",
        })
        return
      }
    }
    
    try {
      setIsProcessing(true)
      
      // Construct payment data
      const paymentData = {
        paymentId: payment?.id || null,
        userId: user?.id,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod === "creditCard" ? "CREDIT_CARD" : "BANK_TRANSFER",
        transactionId: `TXN-${Date.now().toString().substring(5)}`, // Generate a mock transaction ID
        cardDetails: paymentMethod === "creditCard" ? {
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiryDate: cardExpiry,
          cardholderName: cardName,
          saveCard: savePaymentMethod
        } : undefined
      }
      
      // Make API call to process payment
      const response = await paymentApi.makePayment(paymentData)
      
      // Handle success
      toast({
        title: "Payment Successful",
        description: `Your payment of ${formatCurrency(parseFloat(amount))} has been processed.`,
      })
      
      // Reset form and close dialog
      resetForm()
      onSuccess()
      
    } catch (error) {
      console.error("Payment failed:", error)
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm()
      onOpenChange(open)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Make a Payment</DialogTitle>
          <DialogDescription>
            {payment ? (
              <>
                Payment for {formatDate(payment.dueDate)} - {formatCurrency(payment.amount)}
              </>
            ) : (
              "Enter your payment details below"
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-8"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!!payment}
                  required
                />
              </div>
            </div>
            
            {payment && (
              <div className="rounded-md bg-muted p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="font-medium">{payment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-medium">{formatDate(payment.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan ID:</span>
                  <span className="font-medium">{payment.paymentPlanId}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Payment Method */}
          <div className="space-y-4">
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="creditCard" id="creditCard" />
                <Label htmlFor="creditCard" className="flex items-center">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Credit or Debit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-md border p-3">
                <RadioGroupItem value="bankTransfer" id="bankTransfer" />
                <Label htmlFor="bankTransfer" className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Bank Transfer
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <Separator />
          
          {/* Payment method specific fields */}
          {paymentMethod === "creditCard" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={handleExpiryChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">Security Code</Label>
                  <Input
                    id="cvc"
                    type="text"
                    placeholder="CVC"
                    value={cardCvc}
                    onChange={handleCvcChange}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardName">Cardholder Name</Label>
                <Input
                  id="cardName"
                  type="text"
                  placeholder="Name on card"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="savePaymentMethod"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={savePaymentMethod}
                  onChange={(e) => setSavePaymentMethod(e.target.checked)}
                />
                <Label htmlFor="savePaymentMethod" className="text-sm font-normal">
                  Save this card for future payments
                </Label>
              </div>
            </div>
          )}
          
          {paymentMethod === "bankTransfer" && (
            <div className="rounded-md bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">Bank Transfer Instructions</p>
              <p>Please use the following details to make your transfer:</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-medium">Solar Energy Company LLC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-medium">12345678</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Routing Number:</span>
                <span className="font-medium">087654321</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-medium">Payment ID {payment?.id || "N/A"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Please allow 1-3 business days for your payment to be processed.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : `Pay ${formatCurrency(parseFloat(amount) || 0)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}