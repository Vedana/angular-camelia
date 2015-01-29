Camelia
=========

Powerfull Angular components library

#### Samples

Declare the grid component in the page :
```html

<cm:dataGrid value="dataModel" id="myGrid" style="width: 800px; height:400px" rows="20">
	<cm:dataColumn id="TOWN" title="Town" width="150px"></cm:dataColumn>
	<cm:dataColumn title="Postal code" width="60px" fieldName="pc"></cm:dataColumn>
	<cm:dataColumn title="Info 1" value="{{$row.name1}}" width="150px"></cm:dataColumn>
	<cm:dataColumn title="Info 2" value="Before {{$row.name2|upper}} after" width="150px"></cm:dataColumn>
</cm:dataGrid>

<cm:pager for="myGrid"></cm:pager>
```
More complex sample generate :
![sample](https://cdn.rawgit.com/Vedana/camelia/master/readme/grid-sample1.png)


Some examples of Camelia usage can be found at https://github.com/Vedana/camelia-samples .



## <a name="installing"></a> Installing Build (Distribution Files)

#### Bower 

For developers not interested in building the Camelia library... use **bower** to install
and use the Camelia distribution files.

Change to your project's root directory.

```bash
# To get the latest stable version, use Bower from the command line.
bower install camelia

# To get the most recent, latest committed-to-master version use:
bower install camelia#master
```

## Author

Olivier Oeuillot  (oeuillot@vedana.com)

## License

(Creative Commons License)

The licensor permits others to copy, distribute, display, and perform the work. In return, licenses may not use the work for commercial purposes -- unless they get the licensor's permission.

The licensor permits others to copy, distribute, display and perform only unaltered copies of the work -- not derivative works based on it.

