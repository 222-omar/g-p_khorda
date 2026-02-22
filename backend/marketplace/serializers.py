from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserProfile, Product, ProductImage, Auction, Bid, Conversation, Message


class UserSerializer(serializers.ModelSerializer):
    """User serializer for authentication responses"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'phone', 'city', 'trust_score', 
            'is_verified', 'avatar', 'wallet_balance', 
            'total_sales', 'seller_rating', 'created_at'
        ]
        read_only_fields = ['id', 'trust_score', 'wallet_balance', 'total_sales', 'seller_rating', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """Product image serializer"""
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary', 'order']
        read_only_fields = ['id']


class BidSerializer(serializers.ModelSerializer):
    """Bid serializer with bidder info"""
    bidder_name = serializers.CharField(source='bidder.username', read_only=True)
    bidder_avatar = serializers.ImageField(source='bidder.profile.avatar', read_only=True)
    
    class Meta:
        model = Bid
        fields = ['id', 'auction', 'bidder', 'bidder_name', 'bidder_avatar', 'amount', 'created_at']
        read_only_fields = ['id', 'created_at']


class AuctionSerializer(serializers.ModelSerializer):
    """Auction serializer with bidding history"""
    bids = BidSerializer(many=True, read_only=True)
    highest_bidder_name = serializers.CharField(source='highest_bidder.username', read_only=True, allow_null=True)
    total_bids = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Auction
        fields = [
            'id', 'product', 'product_title', 'product_image',
            'starting_bid', 'current_bid', 'highest_bidder', 
            'highest_bidder_name', 'start_time', 'end_time', 
            'is_active', 'total_bids', 'bids'
        ]
        read_only_fields = ['id', 'current_bid', 'highest_bidder']

    def get_total_bids(self, obj):
        return obj.bids.count()

    def get_product_image(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight product serializer for list views"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    primary_image = serializers.SerializerMethodField()
    is_auction = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'price', 'category', 'condition', 'status',
            'location', 'phone_number', 'is_auction',
            'auction_end_time', 'primary_image', 'owner_name', 'views_count', 'created_at'
        ]
        read_only_fields = ['id', 'owner_name', 'views_count', 'created_at']
    
    def get_primary_image(self, obj):
        primary_img = obj.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer with all relations"""
    owner = UserSerializer(read_only=True)
    owner_profile = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    auction = AuctionSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'owner', 'owner_profile', 'title', 'description', 
            'price', 'category', 'condition', 'status', 'location',
            'phone_number', 'is_auction', 'auction_end_time', 
            'views_count', 'images', 'auction', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'views_count', 'created_at', 'updated_at']
    
    def get_owner_profile(self, obj):
        try:
            profile = obj.owner.profile
            return {
                'trust_score': profile.trust_score,
                'seller_rating': float(profile.seller_rating),
                'total_sales': profile.total_sales,
                'city': profile.city,
                'avatar': self.context['request'].build_absolute_uri(profile.avatar.url) if profile.avatar else None
            }
        except UserProfile.DoesNotExist:
            return None


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating products"""
    images = ProductImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'price', 'category', 'condition', 
            'location', 'phone_number', 'is_auction',
            'auction_end_time', 'images', 'uploaded_images'
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        try:
            uploaded_images = validated_data.pop('uploaded_images', [])
            product = Product.objects.create(**validated_data)
            
            # Create Auction if is_auction and end_time provided
            # Auction starts NOW (at creation time)
            if product.is_auction and product.auction_end_time:
                Auction.objects.create(
                    product=product,
                    starting_bid=product.price,
                    current_bid=product.price,
                    start_time=timezone.now(),
                    end_time=product.auction_end_time,
                    is_active=True
                )
            
            # Create product images
            for idx, image in enumerate(uploaded_images):
                ProductImage.objects.create(
                    product=product,
                    image=image,
                    is_primary=(idx == 0),
                    order=idx
                )
            
            return product
        except Exception as e:
            if 'product' in locals():
                product.delete()
            # Log error for server-side debugging
            import traceback
            traceback.print_exc()
            # Return error to client
            raise serializers.ValidationError({"detail": f"Server Error: {str(e)}"})

    def to_representation(self, instance):
        try:
            return super().to_representation(instance)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "id": instance.id, 
                "title": instance.title, 
                "warning": "Product created but failed to serialize response",
                "error": str(e)
            }


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    city = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'city', 'phone']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        city = validated_data.pop('city')
        phone = validated_data.pop('phone', '')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        # Create user profile
        UserProfile.objects.create(user=user, city=city, phone=phone)
        
        return user


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages"""
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_avatar', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_avatar(self, obj):
        try:
            if obj.sender.profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.sender.profile.avatar.url)
        except UserProfile.DoesNotExist:
            pass
        return None


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight conversation serializer for list views"""
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'product', 'product_title', 'product_image',
            'other_participant', 'last_message', 'unread_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content[:100],
                'sender_name': last_msg.sender.username,
                'created_at': last_msg.created_at.isoformat(),
                'is_read': last_msg.is_read,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other_user = obj.seller if request.user == obj.buyer else obj.buyer
            avatar_url = None
            try:
                if other_user.profile.avatar:
                    avatar_url = request.build_absolute_uri(other_user.profile.avatar.url)
            except UserProfile.DoesNotExist:
                pass
            return {
                'id': other_user.id,
                'username': other_user.username,
                'avatar': avatar_url,
            }
        return None

    def get_product_image(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Full conversation serializer with all messages"""
    messages = MessageSerializer(many=True, read_only=True)
    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'product', 'product_title', 'product_image',
            'buyer', 'seller', 'messages', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_product_image(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None
