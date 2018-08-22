require 'openssl'
require 'base64'
                  
    def pem_to_magic_key(public_key)
      modulus, exponent = [public_key.n, public_key.e].map do |component|
        result = []

        until component.zero?
          result << [component % 256].pack('C')
          component >>= 8
        end

        result.reverse.join
      end

      (['RSA'] + [modulus, exponent].map { |n| Base64.urlsafe_encode64(n) }).join('.')
    end

keypair = OpenSSL::PKey::RSA.new(1024)
puts keypair.public_key.to_pem
puts keypair.to_pem
magic_key = pem_to_magic_key(keypair.public_key)

puts "data:application/magic-public-key,#{magic_key}"
